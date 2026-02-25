import { Args, Command, Flags } from "@oclif/core";
import { loadAllConfig } from "../core/config/index.js";
import { executeGraph } from "../core/executor/index.js";
import {
  buildMultiWorkspaceTaskGraph,
  buildTaskGraph,
} from "../core/task/index.js";
import {
  getAllWorkspaces,
  getEffectiveWorkspace,
  getWorkspacesByTag,
  resolveWorkspaces,
} from "../core/workspace/index.js";
import { CockpitError } from "../utils/errors.js";

export default class Run extends Command {
  static override description = "Run a task in one or more workspaces";

  static override examples = [
    "<%= config.bin %> run build",
    "<%= config.bin %> run test --workspace=core",
    "<%= config.bin %> run build --all",
    "<%= config.bin %> run lint --tag=library",
    "<%= config.bin %> run build -- --noEmit",
  ];

  // Allow extra arguments after --
  static override strict = false;

  static override args = {
    task: Args.string({
      description: "Task name to run",
      required: true,
    }),
  };

  static override flags = {
    workspace: Flags.string({
      char: "w",
      description: "Run in specific workspace(s)",
      multiple: true,
    }),
    all: Flags.boolean({
      description: "Run in all workspaces",
      default: false,
    }),
    tag: Flags.string({
      char: "t",
      description: "Run in workspaces with tag",
      multiple: true,
    }),
    force: Flags.boolean({
      char: "f",
      description: "Skip cache and force execution",
      default: false,
    }),
    "dry-run": Flags.boolean({
      description: "Show what would run without executing",
      default: false,
    }),
    concurrency: Flags.integer({
      char: "c",
      description: "Max parallel tasks",
      default: 4,
    }),
    "continue-on-error": Flags.boolean({
      description: "Continue running tasks even if one fails",
      default: false,
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Verbose output",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags, argv } = await this.parse(Run);
    const cwd = process.cwd();

    // Extract extra args (arguments after the task name)
    // argv contains all arguments, the first is the task name
    const extraArgs = (argv as string[]).slice(1);

    try {
      // Load configuration
      const config = await loadAllConfig(cwd);
      const workspaceContext = await resolveWorkspaces(config);

      // Parse the task argument to check if it includes a workspace prefix
      // Format: "workspace:task" or just "task"
      // Note: Task names can contain colons (e.g., "lint:all"), so we need to
      // check if the prefix is actually a workspace
      let targetWorkspace: string | undefined;
      let targetTask: string;

      if (args.task.includes(":")) {
        const colonIndex = args.task.indexOf(":");
        const possibleWorkspace = args.task.slice(0, colonIndex);
        const possibleTask = args.task.slice(colonIndex + 1);

        // Check if the prefix is a valid workspace or empty (root)
        if (
          possibleWorkspace === "" ||
          workspaceContext.workspaces.has(possibleWorkspace)
        ) {
          targetWorkspace = possibleWorkspace;
          targetTask = possibleTask;
        } else {
          // Not a workspace prefix, treat whole string as task name
          targetTask = args.task;
        }
      } else {
        targetTask = args.task;
      }

      // Determine which workspaces to run in
      let graph;

      if (flags.all) {
        // Run in all workspaces
        const workspaceIds = getAllWorkspaces(workspaceContext).map(
          (ws) => ws.id
        );
        graph = buildMultiWorkspaceTaskGraph(
          workspaceContext,
          workspaceIds,
          targetTask
        );
      } else if (flags.tag && flags.tag.length > 0) {
        // Run in workspaces with specific tags
        const taggedWorkspaces = new Set<string>();
        for (const tag of flags.tag) {
          for (const ws of getWorkspacesByTag(workspaceContext, tag)) {
            taggedWorkspaces.add(ws.id);
          }
        }
        const workspaceIds = Array.from(taggedWorkspaces);
        graph = buildMultiWorkspaceTaskGraph(
          workspaceContext,
          workspaceIds,
          targetTask
        );
      } else if (flags.workspace && flags.workspace.length > 0) {
        // Run in specified workspaces
        if (flags.workspace.length === 1) {
          graph = buildTaskGraph(
            workspaceContext,
            flags.workspace[0]!,
            targetTask
          );
        } else {
          graph = buildMultiWorkspaceTaskGraph(
            workspaceContext,
            flags.workspace,
            targetTask
          );
        }
      } else if (targetWorkspace !== undefined) {
        // Task specified with workspace prefix (e.g., "core:build" or ":build")
        graph = buildTaskGraph(workspaceContext, targetWorkspace, targetTask);
      } else {
        // Run in current/detected workspace or root
        const effectiveWorkspace = getEffectiveWorkspace(workspaceContext, cwd);
        const wsId = effectiveWorkspace ? effectiveWorkspace.id : "";
        graph = buildTaskGraph(workspaceContext, wsId, targetTask);
      }

      if (graph.tasks.size === 0) {
        this.log(`No tasks found matching '${args.task}'`);
        return;
      }

      // Execute
      // Identify main task IDs (those that were explicitly requested, not dependencies)
      const mainTaskIds = new Set(graph.rootTasks);

      const result = await executeGraph(graph, workspaceContext, {
        concurrency: flags.concurrency,
        continueOnError: flags["continue-on-error"],
        force: flags.force,
        dryRun: flags["dry-run"],
        verbose: flags.verbose,
        extraArgs: extraArgs.length > 0 ? extraArgs : undefined,
        mainTaskIds: extraArgs.length > 0 ? mainTaskIds : undefined,
      });

      if (!result.success) {
        this.exit(1);
      }
    } catch (error) {
      if (error instanceof CockpitError) {
        this.error(error.message);
      }
      throw error;
    }
  }
}
