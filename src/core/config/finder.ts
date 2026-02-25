import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { CONFIG_DIR, TASK_FILE, WORKSPACES_FILE } from "../../constants.js";

/**
 * Result of finding the workspace root.
 */
export interface FindRootResult {
  /** Absolute path to the workspace root */
  root: string;
  /** Path to the .cockpit directory */
  configDir: string;
  /** Path to the workspaces.ts file */
  workspacesFile: string;
  /** Path to the root cockpit.ts file (may not exist) */
  rootTaskFile: string;
}

/**
 * Walk up the directory tree to find the workspace root.
 * The root is identified by the presence of a .cockpit directory.
 *
 * @param startPath - Directory to start searching from
 * @returns The root result or null if not found
 */
export function findWorkspaceRoot(startPath: string): FindRootResult | null {
  let currentPath = startPath;

  while (true) {
    const configDir = join(currentPath, CONFIG_DIR);

    if (existsSync(configDir)) {
      return {
        root: currentPath,
        configDir,
        workspacesFile: join(configDir, WORKSPACES_FILE),
        rootTaskFile: join(currentPath, TASK_FILE),
      };
    }

    const parentPath = dirname(currentPath);

    // Reached filesystem root
    if (parentPath === currentPath) {
      return null;
    }

    currentPath = parentPath;
  }
}

/**
 * Get the path to a workspace's cockpit.ts file.
 *
 * @param workspacePath - Absolute path to the workspace directory
 * @returns Path to the cockpit.ts file
 */
export function getWorkspaceTaskFile(workspacePath: string): string {
  return join(workspacePath, TASK_FILE);
}

/**
 * Check if a path is inside a given root directory.
 *
 * @param path - Path to check
 * @param root - Root directory
 * @returns True if path is inside root
 */
export function isInsideRoot(path: string, root: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/");
  return (
    normalizedPath === normalizedRoot ||
    normalizedPath.startsWith(normalizedRoot + "/")
  );
}

/**
 * Get the relative path from root to a given path.
 *
 * @param path - Absolute path
 * @param root - Root directory
 * @returns Relative path from root
 */
export function getRelativePath(path: string, root: string): string {
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");

  if (normalizedPath === normalizedRoot) {
    return ".";
  }

  if (normalizedPath.startsWith(normalizedRoot + "/")) {
    return normalizedPath.slice(normalizedRoot.length + 1);
  }

  return normalizedPath;
}
