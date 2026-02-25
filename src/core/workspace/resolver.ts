import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedWorkspace } from "../../types/index.js";
import { WorkspaceNotFoundError } from "../../utils/errors.js";
import type { ConfigContext } from "../config/index.js";
import { loadWorkspaceTaskConfig } from "../config/loader.js";
import { deduplicateMatches, expandGlobs } from "./glob.js";

/**
 * Resolved workspace context with all workspaces and their configs.
 */
export interface WorkspaceContext {
  /** Config context with root and loaded configs */
  config: ConfigContext;
  /** All resolved workspaces by ID */
  workspaces: Map<string, ResolvedWorkspace>;
  /** Default workspace ID (if specified) */
  defaultWorkspace: string | null;
}

/**
 * Resolve all workspaces from configuration.
 *
 * @param config - Configuration context
 * @returns Workspace context with all resolved workspaces
 */
export async function resolveWorkspaces(
  config: ConfigContext
): Promise<WorkspaceContext> {
  const { workspacesConfig, root } = config;
  const workspaces = new Map<string, ResolvedWorkspace>();

  // Process explicit workspace definitions
  if (workspacesConfig.workspaces) {
    for (const [id, def] of Object.entries(workspacesConfig.workspaces)) {
      const absolutePath = join(root.root, def.path);

      if (!existsSync(absolutePath)) {
        console.warn(
          `Warning: Workspace '${id}' path does not exist: ${def.path}`
        );
        continue;
      }

      workspaces.set(id, {
        id,
        name: def.name ?? id,
        path: absolutePath,
        relativePath: def.path,
        tags: def.tags ?? [],
        dependsOn: def.dependsOn ?? [],
      });

      // Load task config for this workspace
      await loadWorkspaceTaskConfig(config, id, absolutePath);
    }
  }

  // Process glob patterns
  if (workspacesConfig.globs && workspacesConfig.globs.length > 0) {
    const explicitIds = new Set(workspaces.keys());
    const globMatches = await expandGlobs(workspacesConfig.globs, root.root);
    const uniqueMatches = deduplicateMatches(globMatches, explicitIds);

    for (const match of uniqueMatches) {
      workspaces.set(match.id, {
        id: match.id,
        name: match.id,
        path: match.path,
        relativePath: match.relativePath,
        tags: [],
        dependsOn: [],
      });

      // Load task config for this workspace
      await loadWorkspaceTaskConfig(config, match.id, match.path);
    }
  }

  return {
    config,
    workspaces,
    defaultWorkspace: workspacesConfig.defaultWorkspace ?? null,
  };
}

/**
 * Get a workspace by ID.
 *
 * @param context - Workspace context
 * @param id - Workspace ID
 * @returns The resolved workspace
 * @throws WorkspaceNotFoundError if not found
 */
export function getWorkspace(
  context: WorkspaceContext,
  id: string
): ResolvedWorkspace {
  const workspace = context.workspaces.get(id);

  if (!workspace) {
    throw new WorkspaceNotFoundError(id, Array.from(context.workspaces.keys()));
  }

  return workspace;
}

/**
 * Get workspaces by tag.
 *
 * @param context - Workspace context
 * @param tag - Tag to filter by
 * @returns Array of matching workspaces
 */
export function getWorkspacesByTag(
  context: WorkspaceContext,
  tag: string
): ResolvedWorkspace[] {
  return Array.from(context.workspaces.values()).filter((ws) =>
    ws.tags.includes(tag)
  );
}

/**
 * Get all workspaces.
 *
 * @param context - Workspace context
 * @returns Array of all workspaces
 */
export function getAllWorkspaces(
  context: WorkspaceContext
): ResolvedWorkspace[] {
  return Array.from(context.workspaces.values());
}
