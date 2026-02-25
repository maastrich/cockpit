import fg from "fast-glob";
import { basename, join } from "node:path";

/**
 * Result of glob expansion for a single match.
 */
export interface GlobMatch {
  /** The directory name (used as workspace ID) */
  id: string;
  /** Absolute path to the matched directory */
  path: string;
  /** The relative path from root */
  relativePath: string;
}

/**
 * Expand glob patterns to find workspace directories.
 *
 * @param patterns - Array of glob patterns
 * @param rootDir - Root directory to search from
 * @returns Array of matched directories
 */
export async function expandGlobs(
  patterns: string[],
  rootDir: string
): Promise<GlobMatch[]> {
  if (patterns.length === 0) {
    return [];
  }

  const matches = await fg(patterns, {
    cwd: rootDir,
    onlyDirectories: true,
    absolute: false,
    dot: false,
    ignore: ["**/node_modules/**", "**/.git/**"],
  });

  return matches.map((relativePath) => ({
    id: basename(relativePath),
    path: join(rootDir, relativePath),
    relativePath,
  }));
}

/**
 * Deduplicate workspace matches, preferring explicit definitions over globs.
 *
 * @param globs - Matches from glob expansion
 * @param explicit - Explicit workspace IDs from config
 * @returns Filtered glob matches (excluding those defined explicitly)
 */
export function deduplicateMatches(
  globs: GlobMatch[],
  explicit: Set<string>
): GlobMatch[] {
  return globs.filter((match) => !explicit.has(match.id));
}
