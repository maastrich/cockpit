import type { ResolvedTask } from "../../types/index.js";
import type { WorkspaceContext } from "../workspace/index.js";
import {
  createTaskId,
  getTaskDefinition,
  parseTaskId,
  resolveTask,
} from "./resolver.js";
import { getParallelLevels, topologicalSort } from "./topological.js";

/**
 * A task graph containing resolved tasks and their dependencies.
 */
export interface TaskGraph {
  /** All tasks in the graph by ID */
  tasks: Map<string, ResolvedTask>;
  /** Tasks in topological order (dependencies first) */
  executionOrder: string[];
  /** Tasks grouped by parallel execution level */
  parallelLevels: string[][];
  /** Root task IDs (the explicitly requested tasks, not their dependencies) */
  rootTasks: string[];
}

/**
 * Build a task graph for a given target task.
 * Includes the target and all its transitive dependencies.
 *
 * @param context - Workspace context
 * @param targetWorkspace - Target workspace ID
 * @param targetTask - Target task name
 * @returns Task graph
 */
export function buildTaskGraph(
  context: WorkspaceContext,
  targetWorkspace: string,
  targetTask: string
): TaskGraph {
  const tasks = new Map<string, ResolvedTask>();
  const visited = new Set<string>();
  const rootTaskId = createTaskId(targetWorkspace, targetTask);
  const queue: string[] = [rootTaskId];

  // BFS to collect all tasks and dependencies
  while (queue.length > 0) {
    const taskId = queue.shift()!;

    if (visited.has(taskId)) {
      continue;
    }
    visited.add(taskId);

    const { workspaceId, taskName } = parseTaskId(taskId);
    const resolved = resolveTask(context, workspaceId, taskName);

    tasks.set(taskId, resolved);

    // Add dependencies to queue
    for (const depId of resolved.dependencies) {
      if (!visited.has(depId)) {
        queue.push(depId);
      }
    }
  }

  // Build dependency map for topological sort
  const depMap = new Map<string, string[]>();
  for (const [id, task] of tasks) {
    depMap.set(id, task.dependencies);
  }

  const executionOrder = topologicalSort(depMap);
  const parallelLevels = getParallelLevels(depMap);

  return {
    tasks,
    executionOrder,
    parallelLevels,
    rootTasks: [rootTaskId],
  };
}

/**
 * Build a task graph for running a task in multiple workspaces.
 *
 * @param context - Workspace context
 * @param workspaceIds - Array of workspace IDs
 * @param taskName - Task name to run in each workspace
 * @returns Task graph
 */
export function buildMultiWorkspaceTaskGraph(
  context: WorkspaceContext,
  workspaceIds: string[],
  taskName: string
): TaskGraph {
  const tasks = new Map<string, ResolvedTask>();
  const visited = new Set<string>();

  // Collect tasks from all workspaces
  const rootTasks: string[] = workspaceIds
    .filter((wsId) => {
      // Only include workspaces that have the task
      return getTaskDefinition(context, wsId, taskName) !== null;
    })
    .map((wsId) => createTaskId(wsId, taskName));
  const queue: string[] = [...rootTasks];

  while (queue.length > 0) {
    const taskId = queue.shift()!;

    if (visited.has(taskId)) {
      continue;
    }
    visited.add(taskId);

    const { workspaceId, taskName: name } = parseTaskId(taskId);
    const resolved = resolveTask(context, workspaceId, name);

    tasks.set(taskId, resolved);

    // Add dependencies to queue
    for (const depId of resolved.dependencies) {
      if (!visited.has(depId)) {
        queue.push(depId);
      }
    }
  }

  // Build dependency map for topological sort
  const depMap = new Map<string, string[]>();
  for (const [id, task] of tasks) {
    depMap.set(id, task.dependencies);
  }

  const executionOrder = topologicalSort(depMap);
  const parallelLevels = getParallelLevels(depMap);

  return {
    tasks,
    executionOrder,
    parallelLevels,
    rootTasks,
  };
}

/**
 * Build a task graph for all tasks in all workspaces.
 * Useful for visualizing the full dependency graph.
 *
 * @param context - Workspace context
 * @returns Task graph containing all tasks
 */
export function buildFullTaskGraph(context: WorkspaceContext): TaskGraph {
  const tasks = new Map<string, ResolvedTask>();
  const rootTasks: string[] = [];

  // Collect all tasks from all workspaces
  for (const [workspaceId, config] of context.config.taskConfigs) {
    for (const taskName of Object.keys(config.tasks)) {
      const taskId = createTaskId(workspaceId, taskName);
      const resolved = resolveTask(context, workspaceId, taskName);
      tasks.set(taskId, resolved);
      rootTasks.push(taskId);
    }
  }

  // Build dependency map
  const depMap = new Map<string, string[]>();
  for (const [id, task] of tasks) {
    // Filter dependencies to only those in our graph
    const validDeps = task.dependencies.filter((dep) => tasks.has(dep));
    depMap.set(id, validDeps);
  }

  const executionOrder = topologicalSort(depMap);
  const parallelLevels = getParallelLevels(depMap);

  return {
    tasks,
    executionOrder,
    parallelLevels,
    rootTasks,
  };
}
