import { Command } from "@oclif/core";
import { watch } from "chokidar";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAllConfig } from "../core/config/index.js";
import { buildFullTaskGraph, createTaskId } from "../core/task/index.js";
import {
  getAllWorkspaces,
  resolveWorkspaces,
} from "../core/workspace/index.js";
import { CONFIG_DIR, CACHE_DIR, TASK_FILE } from "../constants.js";

/** Graph output file name within cache directory */
const GRAPH_FILE = "graph.json";

/**
 * Output format for workspace graph updates.
 */
interface GraphOutput {
  /** Timestamp of the update */
  timestamp: string;
  /** Event type */
  event: "initial" | "change" | "error";
  /** Error message if event is "error" */
  error?: string;
  /** Workspaces in the graph */
  workspaces?: Array<{
    id: string;
    name: string;
    path: string;
    tags: string[];
  }>;
  /** Tasks in the graph */
  tasks?: Array<{
    id: string;
    workspace: string;
    name: string;
    description?: string;
    dependencies: string[];
    inputs?: string[];
    outputs?: string[];
  }>;
}

export default class WatchWorkspace extends Command {
  static override description =
    "Watch for config changes and output updated graph (for tooling integration)";

  static override hidden = true;

  static override examples = ["<%= config.bin %> _watch_workspace"];

  async run(): Promise<void> {
    const cwd = process.cwd();
    const graphPath = join(cwd, CONFIG_DIR, CACHE_DIR, GRAPH_FILE);

    // Ensure cache directory exists
    const cacheDir = join(cwd, CONFIG_DIR, CACHE_DIR);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    // Output initial graph
    await this.outputGraph(cwd, graphPath, "initial");
    this.log(`Watching for config changes... (graph: ${graphPath})`);

    // Set up file watcher
    // Watch the entire project directory and filter relevant files
    const watcher = watch(cwd, {
      ignored: [
        // Ignore cache directory
        (path: string) => path.includes(`${CONFIG_DIR}/${CACHE_DIR}`),
        // Ignore node_modules
        (path: string) => path.includes("node_modules"),
        // Ignore .git
        (path: string) => path.includes(".git"),
        // Ignore dist folders
        (path: string) => path.includes("/dist/"),
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 10,
    });

    // Check if a path is a config file we care about
    const isConfigFile = (path: string): boolean => {
      // cockpit.ts files
      if (path.endsWith(`/${TASK_FILE}`) || path.endsWith(`\\${TASK_FILE}`)) {
        return true;
      }
      // Files in .cockpit directory (but not .cache)
      if (
        (path.includes(`/${CONFIG_DIR}/`) || path.includes(`\\${CONFIG_DIR}\\`)) &&
        !path.includes(CACHE_DIR)
      ) {
        return true;
      }
      return false;
    };

    // Debounce rapid changes
    let debounceTimer: NodeJS.Timeout | null = null;
    const debounceMs = 150;

    const handleChange = (path: string) => {
      if (!isConfigFile(path)) {
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(async () => {
        this.log(`Config changed: ${path}`);
        await this.outputGraph(cwd, graphPath, "change");
      }, debounceMs);
    };

    watcher.on("ready", () => {
      this.log("Watcher ready");
    });

    watcher.on("add", handleChange);
    watcher.on("change", handleChange);
    watcher.on("unlink", handleChange);

    // Handle process termination
    const cleanup = () => {
      watcher.close();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Keep the process running
    await new Promise(() => {
      // Never resolves - keeps process alive
    });
  }

  private async outputGraph(
    cwd: string,
    graphPath: string,
    event: "initial" | "change"
  ): Promise<void> {
    const output: GraphOutput = {
      timestamp: new Date().toISOString(),
      event,
    };

    try {
      const config = await loadAllConfig(cwd);
      const workspaceContext = await resolveWorkspaces(config);
      const graph = buildFullTaskGraph(workspaceContext);

      // Build workspaces array
      output.workspaces = getAllWorkspaces(workspaceContext).map((ws) => ({
        id: ws.id,
        name: ws.name,
        path: ws.relativePath,
        tags: ws.tags,
      }));

      // Build tasks array with full details
      output.tasks = [];

      // Root tasks
      const rootConfig = workspaceContext.config.taskConfigs.get("");
      if (rootConfig) {
        for (const [taskName, def] of Object.entries(rootConfig.tasks)) {
          const taskId = createTaskId("", taskName);
          const resolvedTask = graph.tasks.get(taskId);
          output.tasks.push({
            id: taskId,
            workspace: "",
            name: taskName,
            description: def.description,
            dependencies: resolvedTask?.dependencies ?? [],
            inputs: def.inputs,
            outputs: def.outputs,
          });
        }
      }

      // Workspace tasks
      for (const ws of getAllWorkspaces(workspaceContext)) {
        const wsConfig = workspaceContext.config.taskConfigs.get(ws.id);
        if (!wsConfig) continue;

        for (const [taskName, def] of Object.entries(wsConfig.tasks)) {
          const taskId = createTaskId(ws.id, taskName);
          const resolvedTask = graph.tasks.get(taskId);
          output.tasks.push({
            id: taskId,
            workspace: ws.id,
            name: taskName,
            description: def.description,
            dependencies: resolvedTask?.dependencies ?? [],
            inputs: def.inputs,
            outputs: def.outputs,
          });
        }
      }

      this.log(`Graph updated: ${output.workspaces.length} workspaces, ${output.tasks.length} tasks`);
    } catch (error) {
      output.event = "error";
      output.error = error instanceof Error ? error.message : String(error);
      this.log(`Error updating graph: ${output.error}`);
    }

    // Write to file
    writeFileSync(graphPath, JSON.stringify(output, null, 2));
  }
}
