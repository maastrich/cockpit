import type {
  ResolvedTask,
  TaskDependency,
  TaskDefinition,
} from "../../types/index.js";
import { TaskNotFoundError } from "../../utils/errors.js";
import type { WorkspaceContext } from "../workspace/index.js";

/**
 * Parsed task reference.
 */
export interface TaskReference {
  /** Workspace ID (empty string for current/root workspace) */
  workspaceId: string;
  /** Task name */
  taskName: string;
  /** Whether the dependency is optional */
  optional: boolean;
}

/**
 * Parse a task reference string.
 * Supports formats:
 * - "task" - task in current workspace
 * - "workspace:task" - task in specific workspace
 * - ":task" - task in root workspace
 *
 * @param ref - Task reference string or object
 * @param currentWorkspace - Current workspace ID for resolving relative refs
 * @returns Parsed task reference
 */
export function parseTaskReference(
  ref: TaskDependency,
  currentWorkspace: string
): TaskReference {
  const refString = typeof ref === "string" ? ref : ref.task;
  const optional = typeof ref === "object" ? (ref.optional ?? false) : false;

  const colonIndex = refString.indexOf(":");

  if (colonIndex !== -1) {
    // Has colon - extract workspace and task
    // Only split on first colon to preserve colons in task names
    return {
      workspaceId: refString.slice(0, colonIndex),
      taskName: refString.slice(colonIndex + 1),
      optional,
    };
  }

  // No colon means task in current workspace
  return {
    workspaceId: currentWorkspace,
    taskName: refString,
    optional,
  };
}

/**
 * Create a full task ID from workspace and task name.
 *
 * @param workspaceId - Workspace ID (empty string for root)
 * @param taskName - Task name
 * @returns Full task ID in "workspace:task" format
 */
export function createTaskId(workspaceId: string, taskName: string): string {
  return `${workspaceId}:${taskName}`;
}

/**
 * Parse a full task ID back to components.
 * Task ID format: "workspace:task" where task may contain colons.
 *
 * @param taskId - Full task ID
 * @returns Object with workspaceId and taskName
 */
export function parseTaskId(taskId: string): {
  workspaceId: string;
  taskName: string;
} {
  // Only split on the first colon to preserve colons in task names
  const colonIndex = taskId.indexOf(":");

  if (colonIndex === -1) {
    // No colon - treat as task in current workspace
    return { workspaceId: "", taskName: taskId };
  }

  return {
    workspaceId: taskId.slice(0, colonIndex),
    taskName: taskId.slice(colonIndex + 1),
  };
}

/**
 * Get the task definition from a workspace's config.
 *
 * @param context - Workspace context
 * @param workspaceId - Workspace ID (empty string for root)
 * @param taskName - Task name
 * @returns Task definition or null if not found
 */
export function getTaskDefinition(
  context: WorkspaceContext,
  workspaceId: string,
  taskName: string
): TaskDefinition | null {
  const config = context.config.taskConfigs.get(workspaceId);

  if (!config) {
    return null;
  }

  return config.tasks[taskName] ?? null;
}

/**
 * Resolve a task reference to a full ResolvedTask.
 *
 * @param context - Workspace context
 * @param workspaceId - Workspace ID
 * @param taskName - Task name
 * @returns Resolved task
 * @throws TaskNotFoundError if task not found
 */
export function resolveTask(
  context: WorkspaceContext,
  workspaceId: string,
  taskName: string
): ResolvedTask {
  const definition = getTaskDefinition(context, workspaceId, taskName);

  if (!definition) {
    const availableTasks = getAvailableTasks(context, workspaceId);
    throw new TaskNotFoundError(
      createTaskId(workspaceId, taskName),
      availableTasks
    );
  }

  const dependencies = resolveDependencies(
    context,
    workspaceId,
    definition.dependsOn ?? []
  );

  return {
    id: createTaskId(workspaceId, taskName),
    workspaceId,
    name: taskName,
    definition,
    dependencies,
  };
}

/**
 * Resolve dependencies to full task IDs.
 *
 * @param context - Workspace context
 * @param currentWorkspace - Current workspace ID
 * @param deps - Array of dependency references
 * @returns Array of full task IDs
 */
export function resolveDependencies(
  context: WorkspaceContext,
  currentWorkspace: string,
  deps: TaskDependency[]
): string[] {
  const resolved: string[] = [];

  for (const dep of deps) {
    const ref = parseTaskReference(dep, currentWorkspace);
    const taskId = createTaskId(ref.workspaceId, ref.taskName);

    // Check if task exists (unless optional)
    const definition = getTaskDefinition(
      context,
      ref.workspaceId,
      ref.taskName
    );

    if (!definition && !ref.optional) {
      throw new TaskNotFoundError(taskId);
    }

    if (definition) {
      resolved.push(taskId);
    }
  }

  return resolved;
}

/**
 * Get all available task names in a workspace.
 *
 * @param context - Workspace context
 * @param workspaceId - Workspace ID
 * @returns Array of task names
 */
export function getAvailableTasks(
  context: WorkspaceContext,
  workspaceId: string
): string[] {
  const config = context.config.taskConfigs.get(workspaceId);

  if (!config) {
    return [];
  }

  return Object.keys(config.tasks);
}

/**
 * Get all tasks across all workspaces.
 *
 * @param context - Workspace context
 * @returns Array of full task IDs
 */
export function getAllTasks(context: WorkspaceContext): string[] {
  const tasks: string[] = [];

  for (const [workspaceId, config] of context.config.taskConfigs) {
    for (const taskName of Object.keys(config.tasks)) {
      tasks.push(createTaskId(workspaceId, taskName));
    }
  }

  return tasks;
}
