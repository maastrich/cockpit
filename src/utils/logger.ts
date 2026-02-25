import pc from "picocolors";

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Simple hash function for strings (djb2 algorithm).
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Convert HSL to RGB.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * Generate a unique color for a task ID using ANSI true color.
 * The color is deterministic based on the task ID hash.
 */
function getTaskColor(taskId: string): string {
  const hash = hashString(taskId);

  // Use hash to generate a hue (0-360)
  // Use golden ratio to spread colors evenly
  const hue = (hash * 137.508) % 360;

  // Fixed saturation and lightness for vibrant, readable colors
  const saturation = 0.7;
  const lightness = 0.6;

  const [r, g, b] = hslToRgb(hue, saturation, lightness);

  // ANSI true color escape sequence: \x1b[38;2;R;G;Bm
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Reset ANSI color.
 */
const resetColor = "\x1b[0m";

/**
 * Task status for logging.
 */
export type TaskStatus =
  | "starting"
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "cached"
  | "restored";

/**
 * Logger for CLI output with task prefixes.
 */
export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Log a debug message (only in verbose mode).
   */
  debug(message: string): void {
    if (this.verbose) {
      console.log(pc.dim(message));
    }
  }

  /**
   * Log an info message.
   */
  info(message: string): void {
    console.log(message);
  }

  /**
   * Log a warning message.
   */
  warn(message: string): void {
    console.log(pc.yellow(`Warning: ${message}`));
  }

  /**
   * Log an error message.
   */
  error(message: string): void {
    console.error(pc.red(`Error: ${message}`));
  }

  /**
   * Log a task status update.
   */
  task(taskId: string, status: TaskStatus, message?: string): void {
    const prefix = this.formatTaskPrefix(taskId);
    const statusText = this.formatStatus(status);
    const msg = message ? ` ${message}` : "";

    console.log(`${prefix} ${statusText}${msg}`);
  }

  /**
   * Log task output with prefix (generic, uses stdout).
   */
  taskOutput(taskId: string, output: string): void {
    this.taskStdout(taskId, output);
  }

  /**
   * Log task stdout with prefix (preserves original colors/formatting).
   */
  taskStdout(taskId: string, output: string): void {
    const prefix = this.formatTaskPrefix(taskId);
    // Don't split - output as-is to preserve exact formatting
    // Just add prefix to first line if output doesn't start with newline
    if (output) {
      const lines = output.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip trailing empty line from split
        if (i === lines.length - 1 && line === "") continue;
        process.stdout.write(`${prefix} ${line}\n`);
      }
    }
  }

  /**
   * Log task stderr with prefix (preserves original colors/formatting).
   */
  taskStderr(taskId: string, output: string): void {
    const prefix = this.formatTaskPrefix(taskId);
    if (output) {
      const lines = output.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip trailing empty line from split
        if (i === lines.length - 1 && line === "") continue;
        process.stderr.write(`${prefix} ${line}\n`);
      }
    }
  }

  /**
   * Log a summary of task execution.
   */
  summary(results: TaskSummary): void {
    console.log("");
    console.log(pc.bold("Summary:"));
    console.log(
      `  ${pc.green(`${results.success} succeeded`)}, ` +
        `${pc.red(`${results.failed} failed`)}, ` +
        `${pc.blue(`${results.cached} cached`)}, ` +
        `${pc.dim(`${results.skipped} skipped`)}`
    );
    console.log(`  Total time: ${this.formatDuration(results.duration)}`);
  }

  /**
   * Format a task ID as a colored prefix with unique color per task.
   */
  private formatTaskPrefix(taskId: string): string {
    const color = getTaskColor(taskId);
    return `${color}[${taskId}]${resetColor}`;
  }

  /**
   * Format a task status with appropriate color.
   */
  private formatStatus(status: TaskStatus): string {
    switch (status) {
      case "starting":
        return pc.blue("Starting...");
      case "running":
        return pc.blue("Running...");
      case "success":
        return pc.green("Done");
      case "failed":
        return pc.red("Failed");
      case "skipped":
        return pc.dim("Skipped");
      case "cached":
        return pc.yellow("Cached");
      case "restored":
        return pc.magenta("Restored");
    }
  }

  /**
   * Format a duration in milliseconds.
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }
}

/**
 * Summary of task execution.
 */
export interface TaskSummary {
  success: number;
  failed: number;
  cached: number;
  skipped: number;
  duration: number;
}

/**
 * Default logger instance.
 */
export const logger = new Logger();
