import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import fg from "fast-glob";
import type { ResolvedTask } from "../../types/index.js";

/**
 * Calculate a hash of task inputs for caching.
 *
 * @param task - Resolved task
 * @param workspacePath - Absolute path to the workspace
 * @param extraArgs - Extra arguments passed to the task (affects output)
 * @returns Hash string
 */
export async function hashTaskInputs(
  task: ResolvedTask,
  workspacePath: string,
  extraArgs?: string[]
): Promise<string> {
  const hash = createHash("sha256");

  // Hash the command
  hash.update(JSON.stringify(task.definition.command));

  // Hash extra arguments (they can change the output)
  if (extraArgs && extraArgs.length > 0) {
    hash.update(JSON.stringify(extraArgs));
  }

  // Hash environment variables
  if (task.definition.env) {
    hash.update(JSON.stringify(task.definition.env));
  }

  // Hash input files
  if (task.definition.inputs && task.definition.inputs.length > 0) {
    const inputHash = await hashFiles(task.definition.inputs, workspacePath);
    hash.update(inputHash);
  } else {
    // Default: hash all files in workspace (expensive but comprehensive)
    const inputHash = await hashFiles(["**/*"], workspacePath);
    hash.update(inputHash);
  }

  return hash.digest("hex").slice(0, 16);
}

/**
 * Hash files matching the given patterns.
 *
 * @param patterns - Glob patterns
 * @param baseDir - Base directory to search from
 * @returns Hash string
 */
export async function hashFiles(
  patterns: string[],
  baseDir: string
): Promise<string> {
  const files = await fg(patterns, {
    cwd: baseDir,
    absolute: false,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.cache/**"],
  });

  // Sort for deterministic hashing
  files.sort();

  const hash = createHash("sha256");

  for (const file of files) {
    try {
      const fullPath = `${baseDir}/${file}`;
      const stat = statSync(fullPath);

      // Include file path and modification time for fast hashing
      // For more accurate caching, you could hash file contents instead
      hash.update(file);
      hash.update(stat.mtime.toISOString());
      hash.update(stat.size.toString());
    } catch {
      // Skip files that can't be read
    }
  }

  return hash.digest("hex");
}

/**
 * Hash a string value.
 *
 * @param value - String to hash
 * @returns Hash string
 */
export function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
