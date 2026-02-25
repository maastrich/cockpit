import { join } from "node:path";
import type { ResolvedTask } from "../../types/index.js";
import { DEFAULT_TIMEOUT } from "../../constants.js";
import { TaskExecutionError, TaskTimeoutError } from "../../utils/errors.js";
import { type Logger } from "../../utils/logger.js";
import type { WorkspaceContext } from "../workspace/index.js";
import { CacheStore, hashTaskInputs, type OutputChunk } from "../cache/index.js";
import { spawnProcess, type ProcessResult } from "./process.js";

/**
 * Result of running a single task.
 */
export interface TaskResult {
  /** Task ID */
  taskId: string;
  /** Execution status */
  status: "success" | "failed" | "skipped" | "cached";
  /** Duration in milliseconds */
  duration: number;
  /** Process output (if any) */
  output?: string;
  /** Error (if failed) */
  error?: Error;
}

/**
 * Context for task execution.
 */
export interface ExecutionContext {
  /** Workspace context */
  workspaceContext: WorkspaceContext;
  /** Environment variables to pass to tasks */
  env: Record<string, string>;
  /** Force run (skip cache) */
  force: boolean;
  /** Dry run mode */
  dryRun: boolean;
  /** Logger instance */
  logger: Logger;
  /** Verbose output */
  verbose: boolean;
  /** Cache store (optional) */
  cacheStore?: CacheStore;
  /** Extra arguments to pass to main tasks (args after --) */
  extraArgs?: string[];
  /** Task IDs that should receive extra args (main/root tasks only) */
  mainTaskIds?: Set<string>;
}

/**
 * Run a single task.
 *
 * @param task - Resolved task to run
 * @param context - Execution context
 * @returns Task result
 */
export async function runTask(
  task: ResolvedTask,
  context: ExecutionContext
): Promise<TaskResult> {
  const {
    workspaceContext,
    logger,
    dryRun,
    verbose,
    force,
    cacheStore,
    extraArgs,
    mainTaskIds,
  } = context;

  // Determine if this task should receive extra args (only main/root tasks)
  const shouldAppendExtraArgs =
    extraArgs &&
    extraArgs.length > 0 &&
    mainTaskIds &&
    mainTaskIds.has(task.id);
  const startTime = Date.now();

  // Get workspace path
  const workspacePath = task.workspaceId
    ? workspaceContext.workspaces.get(task.workspaceId)?.path
    : workspaceContext.config.root.root;

  if (!workspacePath) {
    return {
      taskId: task.id,
      status: "failed",
      duration: 0,
      error: new Error(`Workspace not found: ${task.workspaceId}`),
    };
  }

  // Calculate working directory
  const cwd = task.definition.cwd
    ? join(workspacePath, task.definition.cwd)
    : workspacePath;

  // Build environment
  const env = {
    ...context.env,
    ...workspaceContext.config.taskConfigs.get(task.workspaceId)?.env,
    ...task.definition.env,
  };

  // Check cache (if enabled for this task)
  const cacheEnabled = task.definition.cache !== false;
  let inputHash: string | undefined;

  // Always compute hash when caching is enabled (for saving after execution)
  // Include extra args in hash if this task receives them (they can change output)
  const argsForHash = shouldAppendExtraArgs ? extraArgs : undefined;

  if (cacheStore && cacheEnabled) {
    try {
      inputHash = await hashTaskInputs(task, workspacePath, argsForHash);

      // Only check cache if not forced
      if (!force && cacheStore.has(task.id, inputHash)) {
        // Check if outputs still exist on disk
        if (cacheStore.hasOutputsOnDisk(task.id, inputHash, workspacePath)) {
          logger.task(task.id, "cached");
          // Replay cached stdout/stderr
          replayCachedOutput(cacheStore, task.id, inputHash, logger);
          return {
            taskId: task.id,
            status: "cached",
            duration: Date.now() - startTime,
          };
        }

        // Outputs missing - try to restore from cache
        const restored = cacheStore.restoreOutputs(task.id, inputHash, workspacePath);
        if (restored > 0) {
          logger.task(task.id, "restored", `(${restored} files from cache)`);
          // Replay cached stdout/stderr
          replayCachedOutput(cacheStore, task.id, inputHash, logger);
          return {
            taskId: task.id,
            status: "cached",
            duration: Date.now() - startTime,
          };
        }

        // Couldn't restore, will need to rebuild
        if (verbose) {
          logger.taskOutput(task.id, "Cache hit but outputs missing, rebuilding...\n");
        }
      }
    } catch {
      // If hashing fails, just run the task
    }
  }

  logger.task(task.id, "starting");

  if (dryRun) {
    logger.task(task.id, "skipped", "(dry run)");
    return {
      taskId: task.id,
      status: "skipped",
      duration: Date.now() - startTime,
    };
  }

  // Capture output chunks in order for caching (with stream type)
  const outputChunks: OutputChunk[] = [];

  try {
    const result = await spawnProcess(task.definition.command, {
      cwd,
      env,
      timeout: task.definition.timeout ?? DEFAULT_TIMEOUT,
      extraArgs: shouldAppendExtraArgs ? extraArgs : undefined,
      // Always stream output to console and capture in order with stream type
      onStdout: (data) => {
        outputChunks.push({ stream: "stdout", data });
        logger.taskStdout(task.id, data);
      },
      onStderr: (data) => {
        outputChunks.push({ stream: "stderr", data });
        logger.taskStderr(task.id, data);
      },
    });

    const taskResult = handleProcessResult(task, result, startTime, logger);

    // Update cache on success (including output files and output chunks)
    if (
      cacheStore &&
      cacheEnabled &&
      taskResult.status === "success" &&
      inputHash
    ) {
      cacheStore.set({
        taskId: task.id,
        inputHash,
        outputs: task.definition.outputs ?? [],
        workspacePath,
        outputChunks,
      });
    }

    return taskResult;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.task(task.id, "failed", `in ${duration}ms`);

    return {
      taskId: task.id,
      status: "failed",
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Handle the result of a process execution.
 */
function handleProcessResult(
  task: ResolvedTask,
  result: ProcessResult,
  startTime: number,
  logger: Logger
): TaskResult {
  const duration = Date.now() - startTime;

  if (result.killed) {
    const error = new TaskTimeoutError(
      task.id,
      task.definition.timeout ?? DEFAULT_TIMEOUT
    );

    logger.task(task.id, "failed", `(timeout after ${duration}ms)`);

    return {
      taskId: task.id,
      status: "failed",
      duration,
      output: result.stdout + result.stderr,
      error,
    };
  }

  if (result.exitCode !== 0) {
    // Check if failure is allowed
    if (task.definition.allowFailure) {
      logger.task(task.id, "success", `(exit ${result.exitCode}, allowed)`);
      return {
        taskId: task.id,
        status: "success",
        duration,
        output: result.stdout + result.stderr,
      };
    }

    const error = new TaskExecutionError(
      task.id,
      result.exitCode,
      result.stderr
    );

    logger.task(task.id, "failed", `(exit ${result.exitCode})`);

    return {
      taskId: task.id,
      status: "failed",
      duration,
      output: result.stdout + result.stderr,
      error,
    };
  }

  const formattedDuration = formatDuration(duration);
  logger.task(task.id, "success", `in ${formattedDuration}`);

  return {
    taskId: task.id,
    status: "success",
    duration,
    output: result.stdout + result.stderr,
  };
}

/**
 * Format a duration in milliseconds.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Replay cached output chunks to the correct streams in original order.
 */
function replayCachedOutput(
  cacheStore: CacheStore,
  taskId: string,
  inputHash: string,
  logger: Logger
): void {
  const chunks = cacheStore.getOutputChunks(taskId, inputHash);

  if (chunks) {
    for (const chunk of chunks) {
      if (chunk.stream === "stdout") {
        logger.taskStdout(taskId, chunk.data);
      } else {
        logger.taskStderr(taskId, chunk.data);
      }
    }
  }
}
