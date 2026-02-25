import { defineConfig, task } from "@maastrich/cockpit";

/**
 * Single project configuration for a calculator library.
 * No workspaces needed - all tasks run from the project root.
 */
export default defineConfig({
  env: {
    NODE_ENV: "development",
  },

  tasks: {
    build: task("pnpm tsc", {
      description: "Build the library",
      inputs: ["src/**/*.ts", "tsconfig.json"],
      outputs: ["dist/**"],
      cleanup: "outputs",
    }),

    test: task("pnpm bun test", {
      description: "Run tests",
      dependsOn: ["build"],
      inputs: ["src/**/*.ts", "src/**/*.test.ts"],
    }),

    lint: task("pnpm oxlint src", {
      description: "Lint source code",
      inputs: ["src/**/*.ts"],
    }),

    "type-check": task("pnpm tsc --noEmit", {
      description: "Run TypeScript type checking",
      inputs: ["src/**/*.ts", "tsconfig.json"],
    }),

    dev: task("pnpm tsc --watch", {
      description: "Start development watch mode",
      cache: false,
    }),

    ci: task("echo 'CI complete!'", {
      description: "Run full CI pipeline",
      dependsOn: ["lint", "type-check", "test"],
    }),

    clean: task("rm -rf dist", {
      description: "Clean build outputs",
      cache: false,
    }),
  },
});
