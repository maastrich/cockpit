import { DEFAULT_CONCURRENCY } from "../../constants.js";
import { Logger, type TaskSummary } from "../../utils/logger.js";
import { CacheStore } from "../cache/index.js";
import type { TaskGraph } from "../task/index.js";
import type { WorkspaceContext } from "../workspace/index.js";
import { type TaskResult } from "./runner.js";
import { scheduleTasks, type SchedulerOptions } from "./scheduler.js";

/**
 * Options for the execution engine.
 */
export interface EngineOptions {
  /** Maximum parallel tasks */
  concurrency?: number;
  /** Continue on error */
  continueOnError?: boolean;
  /** Force run (skip cache) */
  force?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Disable caching */
  noCache?: boolean;
  /** Extra arguments to pass to main tasks (args after --) */
  extraArgs?: string[];
  /** Task IDs that should receive extra args (main/root tasks only) */
  mainTaskIds?: Set<string>;
}

/**
 * Result of engine execution.
 */
export interface EngineResult {
  /** Whether all tasks succeeded */
  success: boolean;
  /** Individual task results */
  results: TaskResult[];
  /** Execution summary */
  summary: TaskSummary;
}

/**
 * Execute a task graph.
 *
 * @param graph - Task graph to execute
 * @param workspaceContext - Workspace context
 * @param options - Engine options
 * @returns Engine result
 */
export async function executeGraph(
  graph: TaskGraph,
  workspaceContext: WorkspaceContext,
  options: EngineOptions = {}
): Promise<EngineResult> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    continueOnError = false,
    force = false,
    dryRun = false,
    verbose = false,
    env = {},
    noCache = false,
    extraArgs,
    mainTaskIds,
  } = options;

  const logger = new Logger(verbose);
  const startTime = Date.now();

  // Create cache store if caching is enabled
  const cacheStore = noCache
    ? undefined
    : new CacheStore(workspaceContext.config.root.root);

  // Log what we're about to run
  const taskCount = graph.tasks.size;
  logger.info(`Running ${taskCount} task${taskCount === 1 ? "" : "s"}...`);
  logger.debug(`Concurrency: ${concurrency}`);

  const schedulerOptions: SchedulerOptions = {
    concurrency,
    continueOnError,
  };

  const results = await scheduleTasks(
    graph,
    {
      workspaceContext,
      env,
      force,
      dryRun,
      logger,
      verbose,
      cacheStore,
      extraArgs,
      mainTaskIds,
    },
    schedulerOptions
  );

  const duration = Date.now() - startTime;
  const summary = calculateSummary(results, duration);

  logger.summary(summary);

  return {
    success: summary.failed === 0,
    results,
    summary,
  };
}

/**
 * Calculate execution summary from results.
 */
function calculateSummary(
  results: TaskResult[],
  duration: number
): TaskSummary {
  let success = 0;
  let failed = 0;
  let cached = 0;
  let skipped = 0;

  for (const result of results) {
    switch (result.status) {
      case "success":
        success++;
        break;
      case "failed":
        failed++;
        break;
      case "cached":
        cached++;
        break;
      case "skipped":
        skipped++;
        break;
    }
  }

  return { success, failed, cached, skipped, duration };
}
