import { Args, Command, Flags } from "@oclif/core";
import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { loadAllConfig } from "../core/config/index.js";
import { CacheStore } from "../core/cache/index.js";
import {
  getAllWorkspaces,
  getEffectiveWorkspace,
  getWorkspacesByTag,
  resolveWorkspaces,
  type WorkspaceContext,
} from "../core/workspace/index.js";
import { CockpitError } from "../utils/errors.js";
import type { CockpitConfig, ResolvedWorkspace, TaskDefinition } from "../types/index.js";

interface CleanupResult {
  workspace: string;
  workspaceId: string;
  task: string;
  deleted: string[];
  errors: string[];
}

/**
 * Get the task config for a workspace.
 */
function getTaskConfig(
  context: WorkspaceContext,
  workspaceId: string
): CockpitConfig | undefined {
  return context.config.taskConfigs.get(workspaceId);
}

/**
 * Expand glob patterns to get file/directory paths.
 */
async function expandCleanupPatterns(
  patterns: string[],
  baseDir: string
): Promise<string[]> {
  const results: string[] = [];

  for (const pattern of patterns) {
    // First, try to match as files/directories with glob
    const matches = await fg(pattern, {
      cwd: baseDir,
      absolute: true,
      onlyFiles: false,
      dot: true,
      ignore: ["**/node_modules/**", "**/.git/**"],
    });

    if (matches.length > 0) {
      results.push(...matches);
    } else {
      // If no glob matches, treat as a direct path
      const directPath = path.resolve(baseDir, pattern);
      if (fs.existsSync(directPath)) {
        results.push(directPath);
      }
    }
  }

  // Deduplicate
  return [...new Set(results)];
}

export default class Cleanup extends Command {
  static override description = "Clean up task outputs and artifacts";

  static override examples = [
    "<%= config.bin %> cleanup build",
    "<%= config.bin %> cleanup build --workspace=core",
    "<%= config.bin %> cleanup build --all",
    "<%= config.bin %> cleanup build --dry-run",
  ];

  static override args = {
    task: Args.string({
      description: "Task name to clean up",
      required: true,
    }),
  };

  static override flags = {
    workspace: Flags.string({
      char: "w",
      description: "Clean up in specific workspace(s)",
      multiple: true,
    }),
    all: Flags.boolean({
      description: "Clean up in all workspaces",
      default: false,
    }),
    tag: Flags.string({
      char: "t",
      description: "Clean up in workspaces with tag",
      multiple: true,
    }),
    "dry-run": Flags.boolean({
      description: "Show what would be deleted without actually deleting",
      default: false,
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Verbose output",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Cleanup);
    const cwd = process.cwd();

    try {
      // Load configuration
      const config = await loadAllConfig(cwd);
      const workspaceContext = await resolveWorkspaces(config);

      // Parse the task argument
      let targetWorkspace: string | undefined;
      let targetTask: string;

      if (args.task.includes(":")) {
        const colonIndex = args.task.indexOf(":");
        const possibleWorkspace = args.task.slice(0, colonIndex);
        const possibleTask = args.task.slice(colonIndex + 1);

        if (
          possibleWorkspace === "" ||
          workspaceContext.workspaces.has(possibleWorkspace)
        ) {
          targetWorkspace = possibleWorkspace;
          targetTask = possibleTask;
        } else {
          targetTask = args.task;
        }
      } else {
        targetTask = args.task;
      }

      // Determine which workspaces to clean up
      interface WorkspaceWithPath {
        workspace: ResolvedWorkspace | null;
        id: string;
        path: string;
      }

      let targetWorkspaces: WorkspaceWithPath[];

      if (flags.all) {
        targetWorkspaces = getAllWorkspaces(workspaceContext).map((ws) => ({
          workspace: ws,
          id: ws.id,
          path: ws.path,
        }));
      } else if (flags.tag && flags.tag.length > 0) {
        const taggedWorkspaces = new Set<ResolvedWorkspace>();
        for (const tag of flags.tag) {
          for (const ws of getWorkspacesByTag(workspaceContext, tag)) {
            taggedWorkspaces.add(ws);
          }
        }
        targetWorkspaces = Array.from(taggedWorkspaces).map((ws) => ({
          workspace: ws,
          id: ws.id,
          path: ws.path,
        }));
      } else if (flags.workspace && flags.workspace.length > 0) {
        targetWorkspaces = flags.workspace.map((wsId) => {
          const ws = workspaceContext.workspaces.get(wsId);
          if (!ws) {
            throw new CockpitError(`Workspace not found: ${wsId}`);
          }
          return { workspace: ws, id: ws.id, path: ws.path };
        });
      } else if (targetWorkspace !== undefined) {
        if (targetWorkspace === "") {
          // Root workspace
          targetWorkspaces = [
            {
              workspace: null,
              id: "",
              path: workspaceContext.config.root.root,
            },
          ];
        } else {
          const ws = workspaceContext.workspaces.get(targetWorkspace);
          if (!ws) {
            throw new CockpitError(`Workspace not found: ${targetWorkspace}`);
          }
          targetWorkspaces = [{ workspace: ws, id: ws.id, path: ws.path }];
        }
      } else {
        // Use current/detected workspace
        const effectiveWorkspace = getEffectiveWorkspace(workspaceContext, cwd);
        if (effectiveWorkspace) {
          targetWorkspaces = [
            {
              workspace: effectiveWorkspace,
              id: effectiveWorkspace.id,
              path: effectiveWorkspace.path,
            },
          ];
        } else {
          // Root workspace
          targetWorkspaces = [
            {
              workspace: null,
              id: "",
              path: workspaceContext.config.root.root,
            },
          ];
        }
      }

      // Initialize cache store for invalidation
      const cacheStore = new CacheStore(workspaceContext.config.root.root);

      // Perform cleanup
      const results: CleanupResult[] = [];
      let totalDeleted = 0;
      let totalErrors = 0;
      let totalCacheInvalidated = 0;

      for (const { id, path: wsPath } of targetWorkspaces) {
        const taskConfig = getTaskConfig(workspaceContext, id);
        const result = await this.cleanupTask(
          id,
          wsPath,
          targetTask,
          taskConfig,
          flags["dry-run"],
          flags.verbose
        );
        if (result) {
          results.push(result);
          totalDeleted += result.deleted.length;
          totalErrors += result.errors.length;

          // Invalidate cache if cleanup was successful and not a dry run
          if (!flags["dry-run"] && result.deleted.length > 0) {
            const taskId = result.workspaceId
              ? `${result.workspaceId}:${result.task}`
              : result.task;
            cacheStore.invalidate(taskId);
            totalCacheInvalidated++;
            if (flags.verbose) {
              this.log(`[${result.workspace}] Cache invalidated for '${result.task}'`);
            }
          }
        }
      }

      // Summary
      if (results.length === 0) {
        this.log(`No cleanup configured for task '${args.task}'`);
        return;
      }

      this.log("");
      if (flags["dry-run"]) {
        this.log(`Dry run: would delete ${totalDeleted} path(s) and invalidate ${results.length} cache(s)`);
      } else {
        this.log(`Cleanup complete: deleted ${totalDeleted} path(s), invalidated ${totalCacheInvalidated} cache(s)`);
      }

      if (totalErrors > 0) {
        this.log(`Errors: ${totalErrors}`);
        this.exit(1);
      }
    } catch (error) {
      if (error instanceof CockpitError) {
        this.error(error.message);
      }
      throw error;
    }
  }

  private async cleanupTask(
    workspaceId: string,
    workspacePath: string,
    taskName: string,
    taskConfig: CockpitConfig | undefined,
    dryRun: boolean,
    verbose: boolean
  ): Promise<CleanupResult | null> {
    const wsLabel = workspaceId || "(root)";

    if (!taskConfig?.tasks[taskName]) {
      if (verbose) {
        this.log(`[${wsLabel}] Task '${taskName}' not found, skipping`);
      }
      return null;
    }

    const task: TaskDefinition = taskConfig.tasks[taskName]!;
    const cleanup = task.cleanup;

    if (!cleanup) {
      if (verbose) {
        this.log(`[${wsLabel}] No cleanup configured for '${taskName}'`);
      }
      return null;
    }

    // Resolve cleanup paths
    let pathsToDelete: string[];

    if (cleanup === "outputs") {
      if (!task.outputs || task.outputs.length === 0) {
        if (verbose) {
          this.log(`[${wsLabel}] cleanup: "outputs" but no outputs defined`);
        }
        return null;
      }
      pathsToDelete = task.outputs;
    } else {
      pathsToDelete = cleanup;
    }

    const result: CleanupResult = {
      workspace: wsLabel,
      workspaceId,
      task: taskName,
      deleted: [],
      errors: [],
    };

    const wsPrefix = workspaceId ? `[${workspaceId}:${taskName}]` : `[:${taskName}]`;

    try {
      // Expand glob patterns
      const expandedPaths = await expandCleanupPatterns(pathsToDelete, workspacePath);

      if (expandedPaths.length === 0) {
        if (verbose) {
          this.log(`${wsPrefix} No paths to clean up`);
        }
        return result;
      }

      for (const targetPath of expandedPaths) {
        try {
          if (dryRun) {
            this.log(`${wsPrefix} Would delete: ${targetPath}`);
            result.deleted.push(targetPath);
          } else {
            await this.deletePath(targetPath);
            this.log(`${wsPrefix} Deleted: ${targetPath}`);
            result.deleted.push(targetPath);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          result.errors.push(`${targetPath}: ${errorMessage}`);
          this.warn(`${wsPrefix} Error deleting ${targetPath}: ${errorMessage}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(errorMessage);
      this.warn(`${wsPrefix} Error expanding patterns: ${errorMessage}`);
    }

    return result;
  }

  private async deletePath(targetPath: string): Promise<void> {
    const stats = await fs.promises.stat(targetPath);

    if (stats.isDirectory()) {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.promises.unlink(targetPath);
    }
  }
}
