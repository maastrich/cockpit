import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import type { CockpitConfig, WorkspacesConfig } from "../../types/index.js";
import {
  ConfigNotFoundError,
  ConfigValidationError,
} from "../../utils/errors.js";
import {
  findWorkspaceRoot,
  getWorkspaceTaskFile,
  type FindRootResult,
} from "./finder.js";
import {
  validateCockpitConfig,
  validateWorkspacesConfig,
} from "./validator.js";

// Create jiti instance for loading TypeScript files
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  moduleCache: false,
});

/**
 * Load a TypeScript module and return its default export.
 *
 * @param filePath - Path to the .ts file
 * @returns The default export of the module
 */
async function loadTsModule<T>(filePath: string): Promise<T> {
  const module = await jiti.import(filePath);

  // Handle both default export and module.default
  if (module && typeof module === "object" && "default" in module) {
    return (module as { default: T }).default;
  }

  return module as T;
}

/**
 * Configuration context containing all loaded configs.
 */
export interface ConfigContext {
  /** Workspace root information */
  root: FindRootResult;
  /** Workspaces configuration from .cockpit/workspaces.ts */
  workspacesConfig: WorkspacesConfig;
  /** Task configs by workspace ID (empty string for root) */
  taskConfigs: Map<string, CockpitConfig>;
}

/**
 * Load the workspaces configuration from .cockpit/workspaces.ts
 *
 * @param rootInfo - Workspace root information
 * @returns The workspaces configuration
 */
export async function loadWorkspacesConfig(
  rootInfo: FindRootResult
): Promise<WorkspacesConfig> {
  const { workspacesFile } = rootInfo;

  if (!existsSync(workspacesFile)) {
    // Return empty config if file doesn't exist
    return { workspaces: {}, globs: [] };
  }

  const raw = await loadTsModule<unknown>(workspacesFile);
  const result = validateWorkspacesConfig(raw);

  if (!result.success) {
    throw new ConfigValidationError(workspacesFile, result.errors);
  }

  return result.data;
}

/**
 * Load a task configuration from a workspace's cockpit.ts file.
 *
 * @param workspacePath - Absolute path to the workspace directory
 * @returns The cockpit config or null if file doesn't exist
 */
export async function loadTaskConfig(
  workspacePath: string
): Promise<CockpitConfig | null> {
  const taskFile = getWorkspaceTaskFile(workspacePath);

  if (!existsSync(taskFile)) {
    return null;
  }

  const raw = await loadTsModule<unknown>(taskFile);
  const result = validateCockpitConfig(raw);

  if (!result.success) {
    throw new ConfigValidationError(taskFile, result.errors);
  }

  return result.data;
}

/**
 * Load all configuration from a starting directory.
 *
 * @param startPath - Directory to start searching from
 * @returns Configuration context with all loaded configs
 */
export async function loadAllConfig(startPath: string): Promise<ConfigContext> {
  const root = findWorkspaceRoot(startPath);

  if (!root) {
    throw new ConfigNotFoundError(startPath, "workspace");
  }

  const workspacesConfig = await loadWorkspacesConfig(root);

  // Load root task config
  const taskConfigs = new Map<string, CockpitConfig>();
  const rootTaskConfig = await loadTaskConfig(root.root);

  if (rootTaskConfig) {
    taskConfigs.set("", rootTaskConfig);
  }

  return {
    root,
    workspacesConfig,
    taskConfigs,
  };
}

/**
 * Load task config for a specific workspace and add it to the context.
 *
 * @param context - Configuration context
 * @param workspaceId - Workspace ID
 * @param workspacePath - Absolute path to the workspace
 */
export async function loadWorkspaceTaskConfig(
  context: ConfigContext,
  workspaceId: string,
  workspacePath: string
): Promise<void> {
  const config = await loadTaskConfig(workspacePath);

  if (config) {
    context.taskConfigs.set(workspaceId, config);
  }
}
