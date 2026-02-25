import { defineWorkspaces } from "@maastrich/cockpit";

export default defineWorkspaces({
  // Explicit workspace definitions with metadata
  workspaces: {
    // Core library - no dependencies
    core: {
      path: "packages/core",
      name: "Core Library",
      tags: ["library", "shared"],
    },

    // Utils library - depends on core
    utils: {
      path: "packages/utils",
      name: "Utilities",
      tags: ["library", "shared"],
      dependsOn: ["core"],
    },

    // Web app - depends on core and utils
    web: {
      path: "apps/web",
      name: "Web Application",
      tags: ["app", "frontend"],
      dependsOn: ["core", "utils"],
    },

    // CLI app - depends on core and utils
    cli: {
      path: "apps/cli",
      name: "CLI Tool",
      tags: ["app", "cli"],
      dependsOn: ["core", "utils"],
    },
  },

  // You can also auto-discover workspaces with globs
  // globs: ["packages/*", "apps/*"],

  // Default workspace when running from root without specifying one
  defaultWorkspace: "web",
});
