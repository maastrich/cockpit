import { z } from "zod";

// Workspace configuration schema
const workspaceDefinitionSchema = z.object({
  path: z.string().min(1),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
});

export const workspacesConfigSchema = z.object({
  workspaces: z.record(z.string(), workspaceDefinitionSchema).optional(),
  globs: z.array(z.string()).optional(),
  defaultWorkspace: z.string().optional(),
});

// Task configuration schema
const commandSpecObjectSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  shell: z.boolean().optional(),
});

const commandSpecSchema = z.union([
  z.string(),
  z.array(z.string()),
  commandSpecObjectSchema,
]);

const taskDependencyObjectSchema = z.object({
  task: z.string(),
  optional: z.boolean().optional(),
});

const taskDependencySchema = z.union([z.string(), taskDependencyObjectSchema]);

const cleanupSpecSchema = z.union([
  z.literal("outputs"),
  z.array(z.string()),
]);

const taskDefinitionSchema = z.object({
  command: commandSpecSchema,
  description: z.string().optional(),
  dependsOn: z.array(taskDependencySchema).optional(),
  env: z.record(z.string(), z.string()).optional(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  cleanup: cleanupSpecSchema.optional(),
  cache: z.boolean().optional(),
  cwd: z.string().optional(),
  allowFailure: z.boolean().optional(),
  timeout: z.number().positive().optional(),
  platform: z.enum(["linux", "darwin", "win32", "all"]).optional(),
});

export const cockpitConfigSchema = z.object({
  tasks: z.record(z.string(), taskDefinitionSchema),
  env: z.record(z.string(), z.string()).optional(),
});

// Type inference
export type ValidatedWorkspacesConfig = z.infer<typeof workspacesConfigSchema>;
export type ValidatedCockpitConfig = z.infer<typeof cockpitConfigSchema>;

/**
 * Validate a workspaces configuration object.
 *
 * @param config - Raw config object to validate
 * @returns Validated config or throws with validation errors
 */
export function validateWorkspacesConfig(config: unknown):
  | {
      success: true;
      data: ValidatedWorkspacesConfig;
    }
  | {
      success: false;
      errors: string[];
    } {
  const result = workspacesConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    ),
  };
}

/**
 * Validate a cockpit task configuration object.
 *
 * @param config - Raw config object to validate
 * @returns Validated config or throws with validation errors
 */
export function validateCockpitConfig(config: unknown):
  | {
      success: true;
      data: ValidatedCockpitConfig;
    }
  | {
      success: false;
      errors: string[];
    } {
  const result = cockpitConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    ),
  };
}
