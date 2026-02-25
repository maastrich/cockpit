/**
 * Defines a single workspace/project in the monorepo.
 */
export interface WorkspaceDefinition {
  /** Relative path from workspace root to this project */
  path: string;
  /** Human-readable name (defaults to directory name if not provided) */
  name?: string;
  /** Tags for filtering and grouping workspaces */
  tags?: string[];
  /** Workspace IDs this workspace depends on */
  dependsOn?: string[];
}

/**
 * Configuration exported from .cockpit/workspaces.ts
 */
export interface WorkspacesConfig {
  /**
   * Map of workspace ID to definition.
   * The ID is used for referencing in dependencies and CLI commands.
   */
  workspaces?: Record<string, WorkspaceDefinition>;

  /**
   * Glob patterns to auto-discover workspaces.
   * Each matching directory creates a workspace with ID = directory name.
   */
  globs?: string[];

  /**
   * Default workspace to use when running from root without specifying one.
   */
  defaultWorkspace?: string;
}

/**
 * A resolved workspace with all computed properties.
 */
export interface ResolvedWorkspace {
  /** Unique identifier for this workspace */
  id: string;
  /** Human-readable name */
  name: string;
  /** Absolute path to the workspace */
  path: string;
  /** Relative path from the workspace root */
  relativePath: string;
  /** Tags for filtering */
  tags: string[];
  /** Workspace IDs this workspace depends on */
  dependsOn: string[];
}

/**
 * Helper function to create a type-safe workspace configuration.
 *
 * @example
 * ```ts
 * import { defineWorkspaces } from "@maastrich/cockpit";
 *
 * export default defineWorkspaces({
 *   workspaces: {
 *     core: { path: "packages/core" },
 *     cli: { path: "packages/cli", dependsOn: ["core"] },
 *   },
 *   globs: ["apps/*"],
 * });
 * ```
 */
export function defineWorkspaces(config: WorkspacesConfig): WorkspacesConfig {
  return config;
}
