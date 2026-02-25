import { defineConfig, task } from "@maastrich/cockpit";

/**
 * CLI application - command-line todo manager.
 * Depends on core and utils libraries.
 */
export default defineConfig({
  tasks: {
    build: task("pnpm tsc", {
      description: "Build the CLI application",
      dependsOn: ["core:build", "utils:build"],
      inputs: ["src/**/*.ts", "tsconfig.json", "package.json"],
      outputs: ["dist/**"],
      cleanup: "outputs",
    }),

    test: task("echo 'No tests configured for CLI yet'", {
      description: "Run CLI tests",
      dependsOn: ["build"],
    }),

    lint: task("pnpm oxlint src", {
      description: "Lint CLI code",
      inputs: ["src/**/*.ts"],
    }),

    "type-check": task("pnpm tsc --noEmit", {
      description: "Run TypeScript type checking",
      dependsOn: ["core:build", "utils:build"],
      inputs: ["src/**/*.ts", "tsconfig.json"],
    }),

    dev: task("pnpm tsc --watch", {
      description: "Start development watch mode",
      dependsOn: ["core:build", "utils:build"],
      cache: false,
    }),

    run: task("node dist/index.js", {
      description: "Run the CLI",
      dependsOn: ["build"],
      cache: false,
    }),
  },
});
