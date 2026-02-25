import pLimit from "p-limit";
import type { TaskGraph } from "../task/index.js";
import { runTask, type ExecutionContext, type TaskResult } from "./runner.js";

/**
 * Options for the scheduler.
 */
export interface SchedulerOptions {
  /** Maximum number of parallel tasks */
  concurrency: number;
  /** Continue running tasks even if one fails */
  continueOnError: boolean;
}

/**
 * Schedule and execute tasks from a task graph.
 *
 * @param graph - Task graph to execute
 * @param context - Execution context
 * @param options - Scheduler options
 * @returns Array of task results
 */
export async function scheduleTasks(
  graph: TaskGraph,
  context: ExecutionContext,
  options: SchedulerOptions
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  const completedTasks = new Set<string>();
  const failedTasks = new Set<string>();
  const limit = pLimit(options.concurrency);

  // Process tasks level by level
  for (const level of graph.parallelLevels) {
    // Check if we should stop due to failures
    if (!options.continueOnError && failedTasks.size > 0) {
      // Skip remaining tasks
      for (const taskId of level) {
        results.push({
          taskId,
          status: "skipped",
          duration: 0,
        });
      }
      continue;
    }

    // Filter tasks whose dependencies have failed
    const runnableTasks: string[] = [];
    const skippedTasks: string[] = [];

    for (const taskId of level) {
      const task = graph.tasks.get(taskId)!;
      const hasFailedDep = task.dependencies.some((dep) =>
        failedTasks.has(dep)
      );

      if (hasFailedDep && !options.continueOnError) {
        skippedTasks.push(taskId);
      } else {
        runnableTasks.push(taskId);
      }
    }

    // Skip tasks with failed dependencies
    for (const taskId of skippedTasks) {
      results.push({
        taskId,
        status: "skipped",
        duration: 0,
      });
    }

    // Run tasks in parallel with concurrency limit
    const levelPromises = runnableTasks.map((taskId) =>
      limit(async () => {
        const task = graph.tasks.get(taskId)!;
        const result = await runTask(task, context);

        if (result.status === "success" || result.status === "cached") {
          completedTasks.add(taskId);
        } else if (result.status === "failed") {
          failedTasks.add(taskId);
        }

        return result;
      })
    );

    const levelResults = await Promise.all(levelPromises);
    results.push(...levelResults);
  }

  return results;
}

/**
 * Execute tasks sequentially in topological order.
 * Simpler alternative to parallel scheduling.
 *
 * @param graph - Task graph to execute
 * @param context - Execution context
 * @param continueOnError - Continue running tasks even if one fails
 * @returns Array of task results
 */
export async function executeSequential(
  graph: TaskGraph,
  context: ExecutionContext,
  continueOnError: boolean
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  const failedTasks = new Set<string>();

  for (const taskId of graph.executionOrder) {
    const task = graph.tasks.get(taskId)!;

    // Check if any dependency failed
    const hasFailedDep = task.dependencies.some((dep) => failedTasks.has(dep));

    if (hasFailedDep && !continueOnError) {
      results.push({
        taskId,
        status: "skipped",
        duration: 0,
      });
      continue;
    }

    // Check if we should stop due to previous failures
    if (!continueOnError && failedTasks.size > 0) {
      results.push({
        taskId,
        status: "skipped",
        duration: 0,
      });
      continue;
    }

    const result = await runTask(task, context);
    results.push(result);

    if (result.status === "failed") {
      failedTasks.add(taskId);
    }
  }

  return results;
}
