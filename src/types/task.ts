/**
 * Task dependency specification.
 * Can be a simple string ("build" or "core:build") or an object with options.
 */
export type TaskDependency =
  | string
  | {
      /** Task reference in format "task" or "workspace:task" */
      task: string;
      /** If true, don't fail if the task doesn't exist */
      optional?: boolean;
    };

/**
 * Command specification for a task.
 */
export type CommandSpec =
  | string
  | string[]
  | {
      /** The command to execute */
      command: string;
      /** Arguments to pass to the command */
      args?: string[];
      /** Working directory relative to workspace root */
      cwd?: string;
      /** Run in shell (default: true) */
      shell?: boolean;
    };

/**
 * Cleanup specification for a task.
 * - "outputs": Delete the paths defined in `outputs`
 * - string[]: Delete the specified paths/globs
 */
export type CleanupSpec = "outputs" | string[];

/**
 * Definition for a single task.
 */
export interface TaskDefinition {
  /** Command(s) to execute */
  command: CommandSpec;

  /** Human-readable description shown in task listings */
  description?: string;

  /** Tasks that must run before this one */
  dependsOn?: TaskDependency[];

  /** Environment variables for this task */
  env?: Record<string, string>;

  /** Input files/globs for cache invalidation */
  inputs?: string[];

  /** Output files/globs produced by this task */
  outputs?: string[];

  /** Paths to clean up when running `cockpit cleanup <task>` */
  cleanup?: CleanupSpec;

  /** Enable caching for this task (default: true) */
  cache?: boolean;

  /** Working directory relative to workspace */
  cwd?: string;

  /** Continue pipeline if this task fails */
  allowFailure?: boolean;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Platform restriction */
  platform?: "linux" | "darwin" | "win32" | "all";
}

/**
 * Configuration exported from cockpit.ts files.
 */
export interface CockpitConfig {
  /** Task definitions for this workspace */
  tasks: Record<string, TaskDefinition>;

  /** Default environment for all tasks in this workspace */
  env?: Record<string, string>;
}

/**
 * Helper function to create a type-safe cockpit configuration.
 *
 * @example
 * ```ts
 * import { defineConfig, task } from "@maastrich/cockpit";
 *
 * export default defineConfig({
 *   tasks: {
 *     build: task("tsup src/index.ts --format esm --dts", {
 *       inputs: ["src/**"],
 *       outputs: ["dist/**"],
 *     }),
 *     test: task("bun test", {
 *       dependsOn: ["build"],
 *     }),
 *   },
 * });
 * ```
 */
export function defineConfig(config: CockpitConfig): CockpitConfig {
  return config;
}

/**
 * Shorthand helper to create a task definition.
 *
 * @example
 * ```ts
 * task("npm run build")
 * task("npm run build", { inputs: ["src/**"] })
 * task(["npm run lint", "npm run test"])
 * ```
 */
export function task(
  command: CommandSpec,
  options?: Omit<TaskDefinition, "command">
): TaskDefinition {
  return { command, ...options };
}

/**
 * A resolved task with workspace context.
 */
export interface ResolvedTask {
  /** Full task ID in format "workspace:task" */
  id: string;
  /** Workspace ID (empty string for root) */
  workspaceId: string;
  /** Task name */
  name: string;
  /** Original task definition */
  definition: TaskDefinition;
  /** Resolved dependencies as full task IDs */
  dependencies: string[];
}
