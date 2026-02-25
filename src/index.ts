export { run } from "@oclif/core";

// Public configuration API
export { defineConfig, defineWorkspaces, task } from "./types/index.js";

// Types
export type {
  CleanupSpec,
  CockpitConfig,
  CommandSpec,
  ResolvedTask,
  ResolvedWorkspace,
  TaskDefinition,
  TaskDependency,
  WorkspaceDefinition,
  WorkspacesConfig,
} from "./types/index.js";

// Errors
export {
  CockpitError,
  ConfigNotFoundError,
  ConfigValidationError,
  CyclicDependencyError,
  TaskExecutionError,
  TaskNotFoundError,
  TaskTimeoutError,
  WorkspaceNotFoundError,
} from "./utils/index.js";
