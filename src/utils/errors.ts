/**
 * Base error class for cockpit errors.
 */
export class CockpitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CockpitError";
  }
}

/**
 * Thrown when a configuration file is not found.
 */
export class ConfigNotFoundError extends CockpitError {
  constructor(
    public readonly searchPath: string,
    public readonly configType: "workspace" | "task"
  ) {
    super(
      configType === "workspace"
        ? `Could not find ${configType} config. Run 'cockpit init' to create one, or ensure .cockpit/workspaces.ts exists.`
        : `Could not find cockpit.ts in ${searchPath}`
    );
    this.name = "ConfigNotFoundError";
  }
}

/**
 * Thrown when a configuration file is invalid.
 */
export class ConfigValidationError extends CockpitError {
  constructor(
    public readonly filePath: string,
    public readonly issues: string[]
  ) {
    super(
      `Invalid configuration in ${filePath}:\n${issues.map((i) => `  - ${i}`).join("\n")}`
    );
    this.name = "ConfigValidationError";
  }
}

/**
 * Thrown when a cyclic dependency is detected in the task graph.
 */
export class CyclicDependencyError extends CockpitError {
  constructor(public readonly cycle: string[]) {
    super(`Cyclic dependency detected: ${cycle.join(" -> ")}`);
    this.name = "CyclicDependencyError";
  }
}

/**
 * Thrown when a referenced task is not found.
 */
export class TaskNotFoundError extends CockpitError {
  constructor(
    public readonly taskRef: string,
    public readonly availableTasks?: string[]
  ) {
    const msg = availableTasks?.length
      ? `Task '${taskRef}' not found. Available tasks: ${availableTasks.join(", ")}`
      : `Task '${taskRef}' not found`;
    super(msg);
    this.name = "TaskNotFoundError";
  }
}

/**
 * Thrown when a referenced workspace is not found.
 */
export class WorkspaceNotFoundError extends CockpitError {
  constructor(
    public readonly workspaceId: string,
    public readonly availableWorkspaces?: string[]
  ) {
    const msg = availableWorkspaces?.length
      ? `Workspace '${workspaceId}' not found. Available workspaces: ${availableWorkspaces.join(", ")}`
      : `Workspace '${workspaceId}' not found`;
    super(msg);
    this.name = "WorkspaceNotFoundError";
  }
}

/**
 * Thrown when a task execution fails.
 */
export class TaskExecutionError extends CockpitError {
  constructor(
    public readonly taskId: string,
    public readonly exitCode: number | null,
    public readonly stderr?: string
  ) {
    super(`Task '${taskId}' failed with exit code ${exitCode ?? "unknown"}`);
    this.name = "TaskExecutionError";
  }
}

/**
 * Thrown when a task times out.
 */
export class TaskTimeoutError extends CockpitError {
  constructor(
    public readonly taskId: string,
    public readonly timeout: number
  ) {
    super(`Task '${taskId}' timed out after ${timeout}ms`);
    this.name = "TaskTimeoutError";
  }
}
