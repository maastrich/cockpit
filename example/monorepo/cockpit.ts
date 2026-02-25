import { defineConfig, task } from "@maastrich/cockpit";

/**
 * Root-level tasks that orchestrate the entire Todo App monorepo.
 * These tasks are available when running from the project root.
 *
 * To clean up build outputs, use: cockpit cleanup build --all
 */
export default defineConfig({
  env: {
    NODE_ENV: "development",
  },

  tasks: {
    install: task("pnpm install", {
      description: "Install all dependencies",
      cache: false,
    }),

    "build:all": task("echo 'All builds complete!'", {
      description: "Build entire monorepo in dependency order",
      dependsOn: ["core:build", "utils:build", "web:build", "cli:build"],
    }),

    "test:all": task("echo 'All tests passed!'", {
      description: "Run all tests across workspaces",
      dependsOn: ["core:test", "utils:test", "web:test", "cli:test"],
    }),

    "lint:all": task("echo 'All linting passed!'", {
      description: "Run linting across all workspaces",
      dependsOn: ["core:lint", "utils:lint", "web:lint", "cli:lint"],
    }),

    "type-check:all": task("echo 'All type checks passed!'", {
      description: "Run type checking across all workspaces",
      dependsOn: ["core:type-check", "utils:type-check", "web:type-check", "cli:type-check"],
    }),

    ci: task("echo 'CI pipeline complete!'", {
      description: "Run full CI pipeline (lint, type-check, test, build)",
      dependsOn: [":lint:all", ":type-check:all", ":test:all", ":build:all"],
    }),

    dev: task("echo 'Development mode started - run workspace-specific dev tasks'", {
      description: "Show development instructions",
      cache: false,
    }),
  },
});
