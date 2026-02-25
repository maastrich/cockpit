import { defineConfig, task } from "@maastrich/cockpit";

/**
 * Web application - todo app frontend.
 * Depends on core and utils libraries.
 */
export default defineConfig({
  tasks: {
    build: task("pnpm tsc", {
      description: "Build the web application",
      dependsOn: ["core:build", "utils:build"],
      inputs: ["src/**/*.ts", "tsconfig.json", "package.json"],
      outputs: ["dist/**"],
      cleanup: "outputs",
    }),

    test: task("echo 'No tests configured for web app yet'", {
      description: "Run web application tests",
      dependsOn: ["build"],
    }),

    lint: task("pnpm oxlint src", {
      description: "Lint web application code",
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

    preview: task("pnpm npx serve public", {
      description: "Preview the app locally",
      dependsOn: ["build"],
      cache: false,
    }),
  },
});
