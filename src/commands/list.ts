import { Command, Flags } from "@oclif/core";
import pc from "picocolors";
import { loadAllConfig } from "../core/config/index.js";
import { createTaskId, getAvailableTasks } from "../core/task/index.js";
import {
  getAllWorkspaces,
  resolveWorkspaces,
} from "../core/workspace/index.js";
import { CockpitError } from "../utils/errors.js";

export default class List extends Command {
  static override description = "List available tasks and workspaces";

  static override examples = [
    "<%= config.bin %> list",
    "<%= config.bin %> list --tasks",
    "<%= config.bin %> list --workspaces",
    "<%= config.bin %> list --workspace=core",
  ];

  static override flags = {
    tasks: Flags.boolean({
      description: "List only tasks",
      default: false,
    }),
    workspaces: Flags.boolean({
      description: "List only workspaces",
      default: false,
    }),
    workspace: Flags.string({
      char: "w",
      description: "List tasks for specific workspace",
    }),
    json: Flags.boolean({
      description: "Output as JSON",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(List);
    const cwd = process.cwd();

    try {
      const config = await loadAllConfig(cwd);
      const workspaceContext = await resolveWorkspaces(config);
      const workspaces = getAllWorkspaces(workspaceContext);

      // Determine what to show
      const showWorkspaces = !flags.tasks || flags.workspaces;
      const showTasks = !flags.workspaces || flags.tasks;

      if (flags.json) {
        this.outputJson(
          workspaceContext,
          showWorkspaces,
          showTasks,
          flags.workspace
        );
        return;
      }

      // List workspaces
      if (showWorkspaces && !flags.workspace) {
        this.log(pc.bold("\nWorkspaces:"));
        if (workspaces.length === 0) {
          this.log(pc.dim("  No workspaces defined"));
        } else {
          for (const ws of workspaces) {
            const tags =
              ws.tags.length > 0 ? pc.dim(` [${ws.tags.join(", ")}]`) : "";
            this.log(`  ${pc.cyan(ws.id)}  ${pc.dim(ws.relativePath)}${tags}`);
          }
        }
      }

      // List tasks
      if (showTasks) {
        this.log(pc.bold("\nTasks:"));

        // Root tasks
        if (!flags.workspace || flags.workspace === "") {
          const rootTasks = getAvailableTasks(workspaceContext, "");
          if (rootTasks.length > 0) {
            this.log(pc.dim("  (root)"));
            this.listTasksForWorkspace(workspaceContext, "", rootTasks);
          }
        }

        // Workspace tasks
        for (const ws of workspaces) {
          if (flags.workspace && flags.workspace !== ws.id) {
            continue;
          }

          const tasks = getAvailableTasks(workspaceContext, ws.id);
          if (tasks.length > 0) {
            this.log(pc.dim(`  ${ws.id}:`));
            this.listTasksForWorkspace(workspaceContext, ws.id, tasks);
          }
        }
      }

      this.log("");
    } catch (error) {
      if (error instanceof CockpitError) {
        this.error(error.message);
      }
      throw error;
    }
  }

  private listTasksForWorkspace(
    context: import("../core/workspace/index.js").WorkspaceContext,
    workspaceId: string,
    tasks: string[]
  ): void {
    for (const taskName of tasks) {
      const config = context.config.taskConfigs.get(workspaceId);
      const def = config?.tasks[taskName];
      const description = def?.description
        ? pc.dim(` - ${def.description}`)
        : "";
      this.log(`    ${pc.green(taskName)}${description}`);
    }
  }

  private outputJson(
    context: import("../core/workspace/index.js").WorkspaceContext,
    showWorkspaces: boolean,
    showTasks: boolean,
    filterWorkspace?: string
  ): void {
    const output: {
      workspaces?: Array<{
        id: string;
        name: string;
        path: string;
        tags: string[];
      }>;
      tasks?: Array<{
        id: string;
        workspace: string;
        name: string;
        description?: string;
      }>;
    } = {};

    if (showWorkspaces && !filterWorkspace) {
      output.workspaces = getAllWorkspaces(context).map((ws) => ({
        id: ws.id,
        name: ws.name,
        path: ws.relativePath,
        tags: ws.tags,
      }));
    }

    if (showTasks) {
      output.tasks = [];

      // Root tasks
      if (!filterWorkspace) {
        const rootTasks = getAvailableTasks(context, "");
        for (const taskName of rootTasks) {
          const config = context.config.taskConfigs.get("");
          const def = config?.tasks[taskName];
          output.tasks.push({
            id: createTaskId("", taskName),
            workspace: "",
            name: taskName,
            description: def?.description,
          });
        }
      }

      // Workspace tasks
      for (const ws of getAllWorkspaces(context)) {
        if (filterWorkspace && filterWorkspace !== ws.id) {
          continue;
        }

        const tasks = getAvailableTasks(context, ws.id);
        for (const taskName of tasks) {
          const config = context.config.taskConfigs.get(ws.id);
          const def = config?.tasks[taskName];
          output.tasks.push({
            id: createTaskId(ws.id, taskName),
            workspace: ws.id,
            name: taskName,
            description: def?.description,
          });
        }
      }
    }

    this.log(JSON.stringify(output, null, 2));
  }
}
