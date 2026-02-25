import { defineConfig, task } from "@maastrich/cockpit";

/**
 * Utils library - common utilities for the todo app.
 * Depends on the core library.
 */
export default defineConfig({
  tasks: {
    build: task("pnpm tsc", {
      description: "Build the utils library",
      dependsOn: ["core:build"],
      inputs: ["src/**/*.ts", "tsconfig.json", "package.json"],
      outputs: ["dist/**"],
      cleanup: "outputs",
    }),

    test: task("pnpm bun test", {
      description: "Run utils library tests",
      dependsOn: ["build"],
      inputs: ["src/**/*.ts", "src/**/*.test.ts"],
    }),

    lint: task("pnpm oxlint src", {
      description: "Lint utils library code",
      inputs: ["src/**/*.ts"],
    }),

    "type-check": task("pnpm tsc --noEmit", {
      description: "Run TypeScript type checking",
      dependsOn: ["core:build"],
      inputs: ["src/**/*.ts", "tsconfig.json"],
    }),

    dev: task("pnpm tsc --watch", {
      description: "Start development watch mode",
      cache: false,
    }),
  },
});
