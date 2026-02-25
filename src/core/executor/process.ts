import {
  spawn,
  type ChildProcess,
  type SpawnOptions,
} from "node:child_process";
import type { CommandSpec } from "../../types/index.js";

/**
 * Result of a process execution.
 */
export interface ProcessResult {
  /** Exit code (null if killed) */
  exitCode: number | null;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether the process was killed (e.g., timeout) */
  killed: boolean;
}

/**
 * Options for spawning a process.
 */
export interface SpawnProcessOptions {
  /** Working directory */
  cwd: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Extra arguments to append to the command */
  extraArgs?: string[];
  /** Callback for stdout data */
  onStdout?: (data: string) => void;
  /** Callback for stderr data */
  onStderr?: (data: string) => void;
}

/**
 * Normalize a command spec to executable form.
 *
 * @param spec - Command specification
 * @param extraArgs - Extra arguments to append to the command
 * @returns Object with command and args
 */
export function normalizeCommand(
  spec: CommandSpec,
  extraArgs?: string[]
): {
  command: string;
  args: string[];
  shell: boolean;
} {
  const extraArgsStr =
    extraArgs && extraArgs.length > 0 ? " " + extraArgs.join(" ") : "";

  if (typeof spec === "string") {
    return { command: spec + extraArgsStr, args: [], shell: true };
  }

  if (Array.isArray(spec)) {
    // Multiple commands - join with &&
    // Append extra args to the last command only
    const commands = [...spec];
    if (commands.length > 0 && extraArgsStr) {
      commands[commands.length - 1] += extraArgsStr;
    }
    return { command: commands.join(" && "), args: [], shell: true };
  }

  // Object spec
  if (extraArgs && extraArgs.length > 0) {
    return {
      command: spec.command,
      args: [...(spec.args ?? []), ...extraArgs],
      shell: spec.shell ?? true,
    };
  }

  return {
    command: spec.command,
    args: spec.args ?? [],
    shell: spec.shell ?? true,
  };
}

/**
 * Spawn a child process and wait for completion.
 *
 * @param spec - Command specification
 * @param options - Spawn options
 * @returns Process result
 */
export async function spawnProcess(
  spec: CommandSpec,
  options: SpawnProcessOptions
): Promise<ProcessResult> {
  const { command, args, shell } = normalizeCommand(spec, options.extraArgs);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const spawnOptions: SpawnOptions = {
      cwd: options.cwd,
      env: {
        ...process.env,
        // Force color output even though we're not a TTY
        FORCE_COLOR: "1",
        CLICOLOR_FORCE: "1",
        // Ensure TERM is set for programs that check it
        TERM: process.env.TERM || "xterm-256color",
        ...options.env,
      },
      shell,
      stdio: ["ignore", "pipe", "pipe"],
    };

    let child: ChildProcess;

    if (shell) {
      // When using shell, pass command as single string
      child = spawn(command, args, spawnOptions);
    } else {
      child = spawn(command, args, spawnOptions);
    }

    // Setup timeout
    if (options.timeout && options.timeout > 0) {
      timeoutId = setTimeout(() => {
        killed = true;
        child.kill("SIGTERM");

        // Force kill after 5 seconds if SIGTERM doesn't work
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 5000);
      }, options.timeout);
    }

    child.stdout?.on("data", (data: Buffer) => {
      const str = data.toString();
      stdout += str;
      options.onStdout?.(str);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const str = data.toString();
      stderr += str;
      options.onStderr?.(str);
    });

    child.on("close", (exitCode) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolve({
        exitCode,
        stdout,
        stderr,
        killed,
      });
    });

    child.on("error", (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + error.message,
        killed: false,
      });
    });
  });
}
