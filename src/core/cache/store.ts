import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  cpSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import fg from "fast-glob";
import { CACHE_DIR, CONFIG_DIR } from "../../constants.js";

/**
 * Cached file entry with relative path and metadata.
 */
export interface CachedFile {
  /** Relative path from workspace root */
  relativePath: string;
  /** File size in bytes */
  size: number;
}

/**
 * Registry entry for a cached hash.
 */
export interface RegistryEntry {
  /** Input hash */
  inputHash: string;
  /** Timestamp when cached */
  timestamp: number;
  /** Output glob patterns (for reference) */
  outputs: string[];
  /** Cached files with metadata */
  cachedFiles: CachedFile[];
}

/**
 * Task registry containing all cached hashes for a task.
 */
export interface TaskRegistry {
  /** Map of inputHash -> entry metadata */
  entries: Record<string, RegistryEntry>;
}

/**
 * Manifest tracking current active hash per task.
 */
export interface CacheManifest {
  /** Map of taskId -> current active inputHash */
  active: Record<string, string>;
}

/**
 * Result of a cache lookup.
 */
export interface CacheLookupResult {
  /** Whether the hash was found in cache */
  found: boolean;
  /** The registry entry if found */
  entry?: RegistryEntry;
  /** Whether this is the currently active hash */
  isActive: boolean;
}

/**
 * A chunk of output with its stream type.
 */
export interface OutputChunk {
  /** Stream type: stdout or stderr */
  stream: "stdout" | "stderr";
  /** The data */
  data: string;
}

/**
 * Options for storing a cache entry.
 */
export interface CacheStoreOptions {
  /** Task ID */
  taskId: string;
  /** Input hash */
  inputHash: string;
  /** Output glob patterns */
  outputs: string[];
  /** Workspace path for file caching */
  workspacePath: string;
  /** Output chunks in order with stream type */
  outputChunks?: OutputChunk[];
}

/**
 * Convert task ID to a safe directory name.
 * Replaces ':' with '__' to avoid filesystem issues.
 */
function taskIdToDir(taskId: string): string {
  return taskId.replace(/:/g, "__");
}

/**
 * File-based cache store with multi-hash output file caching.
 *
 * Structure:
 * .cockpit/.cache/
 * ├── manifest.json           # Current active hash per task
 * └── results/
 *     └── core__build/
 *         ├── registry.json   # All cached hashes for this task
 *         ├── $hash1/
 *         │   ├── outputs/    # Cached output files
 *         │   ├── stderr      # Captured stderr
 *         │   └── stdout      # Captured stdout
 *         └── $hash2/
 *             └── ...
 */
export class CacheStore {
  private cacheDir: string;
  private resultsDir: string;
  private manifestPath: string;
  private manifest: CacheManifest;

  constructor(rootDir: string) {
    this.cacheDir = join(rootDir, CONFIG_DIR, CACHE_DIR);
    this.resultsDir = join(this.cacheDir, "results");
    this.manifestPath = join(this.cacheDir, "manifest.json");
    this.manifest = { active: {} };
    this.loadManifest();
  }

  /**
   * Load the cache manifest from disk.
   */
  private loadManifest(): void {
    if (!existsSync(this.manifestPath)) {
      return;
    }

    try {
      const data = readFileSync(this.manifestPath, "utf-8");
      this.manifest = JSON.parse(data) as CacheManifest;
    } catch {
      this.manifest = { active: {} };
    }
  }

  /**
   * Save the cache manifest to disk.
   */
  private saveManifest(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
    writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  /**
   * Get the task directory path.
   */
  private getTaskDir(taskId: string): string {
    return join(this.resultsDir, taskIdToDir(taskId));
  }

  /**
   * Get the registry path for a task.
   */
  private getRegistryPath(taskId: string): string {
    return join(this.getTaskDir(taskId), "registry.json");
  }

  /**
   * Get the hash directory path.
   */
  private getHashDir(taskId: string, inputHash: string): string {
    return join(this.getTaskDir(taskId), inputHash);
  }

  /**
   * Load the registry for a task.
   */
  private loadRegistry(taskId: string): TaskRegistry {
    const registryPath = this.getRegistryPath(taskId);
    if (!existsSync(registryPath)) {
      return { entries: {} };
    }

    try {
      const data = readFileSync(registryPath, "utf-8");
      return JSON.parse(data) as TaskRegistry;
    } catch {
      return { entries: {} };
    }
  }

  /**
   * Save the registry for a task.
   */
  private saveRegistry(taskId: string, registry: TaskRegistry): void {
    const taskDir = this.getTaskDir(taskId);
    if (!existsSync(taskDir)) {
      mkdirSync(taskDir, { recursive: true });
    }
    writeFileSync(
      this.getRegistryPath(taskId),
      JSON.stringify(registry, null, 2)
    );
  }

  /**
   * Check if a task has a valid cache entry for the given hash.
   *
   * @param taskId - Task ID
   * @param inputHash - Current input hash
   * @returns True if cached
   */
  has(taskId: string, inputHash: string): boolean {
    const registry = this.loadRegistry(taskId);
    return inputHash in registry.entries;
  }

  /**
   * Lookup a cache entry.
   *
   * @param taskId - Task ID
   * @param inputHash - Input hash to lookup
   * @returns Lookup result with entry if found
   */
  lookup(taskId: string, inputHash: string): CacheLookupResult {
    const registry = this.loadRegistry(taskId);
    const entry = registry.entries[inputHash];
    const activeHash = this.manifest.active[taskId];

    return {
      found: entry !== undefined,
      entry,
      isActive: activeHash === inputHash,
    };
  }

  /**
   * Get the current active hash for a task.
   *
   * @param taskId - Task ID
   * @returns Active hash or undefined
   */
  getActiveHash(taskId: string): string | undefined {
    return this.manifest.active[taskId];
  }

  /**
   * Store a cache entry with output files and output chunks.
   *
   * @param options - Cache store options
   */
  set(options: CacheStoreOptions): void {
    const { taskId, inputHash, outputs, workspacePath, outputChunks } = options;

    const hashDir = this.getHashDir(taskId, inputHash);
    const outputsDir = join(hashDir, "outputs");

    // Clean existing hash directory if it exists
    if (existsSync(hashDir)) {
      rmSync(hashDir, { recursive: true, force: true });
    }

    // Create hash directory
    mkdirSync(outputsDir, { recursive: true });

    // Save output chunks as JSON (preserves order and stream type)
    if (outputChunks !== undefined && outputChunks.length > 0) {
      writeFileSync(join(hashDir, "output.json"), JSON.stringify(outputChunks));
    }

    // Cache output files
    const cachedFiles = this.saveOutputFiles(outputsDir, outputs, workspacePath);

    // Update registry
    const registry = this.loadRegistry(taskId);
    registry.entries[inputHash] = {
      inputHash,
      timestamp: Date.now(),
      outputs,
      cachedFiles,
    };
    this.saveRegistry(taskId, registry);

    // Update manifest with active hash
    this.manifest.active[taskId] = inputHash;
    this.saveManifest();
  }

  /**
   * Save output files to the cache directory.
   */
  private saveOutputFiles(
    outputsDir: string,
    outputPatterns: string[],
    workspacePath: string
  ): CachedFile[] {
    const cachedFiles: CachedFile[] = [];

    if (outputPatterns.length === 0) {
      return cachedFiles;
    }

    // Expand glob patterns to get actual files
    const files = fg.sync(outputPatterns, {
      cwd: workspacePath,
      absolute: false,
      onlyFiles: true,
      dot: true,
      ignore: ["**/node_modules/**", "**/.git/**"],
    });

    // Copy each file to the cache
    for (const file of files) {
      const sourcePath = join(workspacePath, file);
      const destPath = join(outputsDir, file);

      try {
        const destDir = dirname(destPath);
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }

        cpSync(sourcePath, destPath);

        const stats = statSync(sourcePath);
        cachedFiles.push({
          relativePath: file,
          size: stats.size,
        });
      } catch {
        // Skip files that can't be copied
      }
    }

    return cachedFiles;
  }

  /**
   * Invalidate a specific hash for a task.
   *
   * @param taskId - Task ID
   * @param inputHash - Hash to invalidate (optional, invalidates all if not provided)
   */
  invalidate(taskId: string, inputHash?: string): void {
    if (inputHash) {
      // Invalidate specific hash
      const registry = this.loadRegistry(taskId);
      delete registry.entries[inputHash];
      this.saveRegistry(taskId, registry);

      // Remove hash directory
      const hashDir = this.getHashDir(taskId, inputHash);
      if (existsSync(hashDir)) {
        rmSync(hashDir, { recursive: true, force: true });
      }

      // Clear active if it was the active hash
      if (this.manifest.active[taskId] === inputHash) {
        delete this.manifest.active[taskId];
        this.saveManifest();
      }
    } else {
      // Invalidate all hashes for this task
      const taskDir = this.getTaskDir(taskId);
      if (existsSync(taskDir)) {
        rmSync(taskDir, { recursive: true, force: true });
      }

      delete this.manifest.active[taskId];
      this.saveManifest();
    }
  }

  /**
   * Check if output files exist on disk for a given hash.
   *
   * @param taskId - Task ID
   * @param inputHash - Input hash
   * @param workspacePath - Workspace root path
   * @returns True if all cached files exist
   */
  hasOutputsOnDisk(
    taskId: string,
    inputHash: string,
    workspacePath: string
  ): boolean {
    const registry = this.loadRegistry(taskId);
    const entry = registry.entries[inputHash];

    if (!entry?.cachedFiles || entry.cachedFiles.length === 0) {
      // No cached files recorded
      return true;
    }

    for (const file of entry.cachedFiles) {
      const filePath = join(workspacePath, file.relativePath);
      if (!existsSync(filePath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Restore cached output files to the workspace.
   *
   * @param taskId - Task ID
   * @param inputHash - Input hash to restore
   * @param workspacePath - Workspace root path
   * @returns Number of files restored, or -1 if no cached files available
   */
  restoreOutputs(
    taskId: string,
    inputHash: string,
    workspacePath: string
  ): number {
    const registry = this.loadRegistry(taskId);
    const entry = registry.entries[inputHash];

    if (!entry?.cachedFiles || entry.cachedFiles.length === 0) {
      return -1;
    }

    const outputsDir = join(this.getHashDir(taskId, inputHash), "outputs");
    if (!existsSync(outputsDir)) {
      return -1;
    }

    let restored = 0;

    for (const file of entry.cachedFiles) {
      const sourcePath = join(outputsDir, file.relativePath);
      const destPath = join(workspacePath, file.relativePath);

      if (!existsSync(sourcePath)) {
        continue;
      }

      try {
        const destDir = dirname(destPath);
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }

        cpSync(sourcePath, destPath);
        restored++;
      } catch {
        // Skip files that can't be restored
      }
    }

    // Update active hash after successful restore
    if (restored > 0) {
      this.manifest.active[taskId] = inputHash;
      this.saveManifest();
    }

    return restored;
  }

  /**
   * Get cached output chunks for a task/hash.
   *
   * @param taskId - Task ID
   * @param inputHash - Input hash
   * @returns Output chunks or undefined
   */
  getOutputChunks(taskId: string, inputHash: string): OutputChunk[] | undefined {
    const outputPath = join(this.getHashDir(taskId, inputHash), "output.json");
    if (!existsSync(outputPath)) {
      return undefined;
    }
    try {
      const data = readFileSync(outputPath, "utf-8");
      return JSON.parse(data) as OutputChunk[];
    } catch {
      return undefined;
    }
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.manifest = { active: {} };

    if (existsSync(this.cacheDir)) {
      rmSync(this.cacheDir, { recursive: true, force: true });
    }
  }

  /**
   * Get cache statistics.
   */
  stats(): { tasks: number; totalEntries: number } {
    let totalEntries = 0;
    const taskDirs = existsSync(this.resultsDir)
      ? fg.sync("*/registry.json", { cwd: this.resultsDir })
      : [];

    for (const registryFile of taskDirs) {
      try {
        const data = readFileSync(join(this.resultsDir, registryFile), "utf-8");
        const registry = JSON.parse(data) as TaskRegistry;
        totalEntries += Object.keys(registry.entries).length;
      } catch {
        // Skip corrupt registries
      }
    }

    return {
      tasks: taskDirs.length,
      totalEntries,
    };
  }

  /**
   * List all cached hashes for a task.
   *
   * @param taskId - Task ID
   * @returns Array of registry entries
   */
  listEntries(taskId: string): RegistryEntry[] {
    const registry = this.loadRegistry(taskId);
    return Object.values(registry.entries);
  }
}
