import { defineConfig, task } from "@maastrich/cockpit";

/**
 * Core library - the foundation of the todo app.
 * Has no dependencies on other workspaces.
 */
export default defineConfig({
  tasks: {
    build: task("pnpm tsc", {
      description: "Build the core library",
      inputs: ["src/**/*.ts", "tsconfig.json", "package.json"],
      outputs: ["dist/**"],
      cleanup: "outputs",
    }),

    test: task("pnpm bun test", {
      description: "Run core library tests",
      dependsOn: ["build"],
      inputs: ["src/**/*.ts", "src/**/*.test.ts"],
    }),

    lint: task("pnpm oxlint src", {
      description: "Lint core library code",
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
  },
});

// test comment
