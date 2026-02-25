export type {
  WorkspaceDefinition,
  WorkspacesConfig,
  ResolvedWorkspace,
} from "./workspace.js";

export { defineWorkspaces } from "./workspace.js";

export type {
  TaskDependency,
  CommandSpec,
  CleanupSpec,
  TaskDefinition,
  CockpitConfig,
  ResolvedTask,
} from "./task.js";

export { defineConfig, task } from "./task.js";
