import { isInsideRoot } from "../config/finder.js";
import type { WorkspaceContext } from "./resolver.js";
import type { ResolvedWorkspace } from "../../types/index.js";

/**
 * Result of workspace detection.
 */
export interface DetectionResult {
  /** The detected workspace, or null if in root */
  workspace: ResolvedWorkspace | null;
  /** Whether the current directory is the workspace root */
  isRoot: boolean;
  /** Whether a workspace was detected */
  detected: boolean;
}

/**
 * Detect which workspace the current directory belongs to.
 *
 * @param context - Workspace context
 * @param cwd - Current working directory
 * @returns Detection result
 */
export function detectWorkspace(
  context: WorkspaceContext,
  cwd: string
): DetectionResult {
  const rootPath = context.config.root.root;

  // Check if we're at the root
  if (cwd === rootPath) {
    return { workspace: null, isRoot: true, detected: true };
  }

  // Check if we're inside any workspace
  for (const workspace of context.workspaces.values()) {
    if (isInsideRoot(cwd, workspace.path)) {
      return { workspace, isRoot: false, detected: true };
    }
  }

  // We're somewhere in the project but not in a specific workspace
  // This could be a directory outside of any workspace (e.g., scripts/, docs/)
  if (isInsideRoot(cwd, rootPath)) {
    return { workspace: null, isRoot: false, detected: false };
  }

  // Outside the project entirely (shouldn't happen if config was found)
  return { workspace: null, isRoot: false, detected: false };
}

/**
 * Get the effective workspace to use for running tasks.
 * Returns the detected workspace, default workspace, or null.
 *
 * @param context - Workspace context
 * @param cwd - Current working directory
 * @param explicitWorkspace - Explicitly specified workspace ID (from CLI)
 * @returns The workspace to use, or null for root
 */
export function getEffectiveWorkspace(
  context: WorkspaceContext,
  cwd: string,
  explicitWorkspace?: string
): ResolvedWorkspace | null {
  // Explicit workspace takes precedence
  if (explicitWorkspace) {
    const workspace = context.workspaces.get(explicitWorkspace);
    return workspace ?? null;
  }

  // Try to detect from current directory
  const detection = detectWorkspace(context, cwd);

  // If we're at the project root, return null (use root workspace)
  if (detection.isRoot) {
    return null;
  }

  // If we detected a specific workspace, use it
  if (detection.workspace) {
    return detection.workspace;
  }

  // Fall back to default workspace only if we couldn't detect anything
  if (context.defaultWorkspace) {
    return context.workspaces.get(context.defaultWorkspace) ?? null;
  }

  return null;
}
