import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Command, Flags } from "@oclif/core";
import pc from "picocolors";
import { CONFIG_DIR, TASK_FILE, WORKSPACES_FILE } from "../constants.js";

export default class Init extends Command {
  static override description = "Initialize cockpit in a project";

  static override examples = [
    "<%= config.bin %> init",
    "<%= config.bin %> init --force",
    "<%= config.bin %> init --template=monorepo",
  ];

  static override flags = {
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing config",
      default: false,
    }),
    template: Flags.string({
      description: "Use a specific template",
      options: ["minimal", "monorepo"],
      default: "minimal",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Init);
    const cwd = process.cwd();

    const configDir = join(cwd, CONFIG_DIR);
    const workspacesFile = join(configDir, WORKSPACES_FILE);
    const taskFile = join(cwd, TASK_FILE);

    // Check if already initialized
    if (!flags.force && existsSync(configDir)) {
      this.error(
        `Cockpit is already initialized in this directory. Use --force to overwrite.`
      );
    }

    // Create .cockpit directory
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
      this.log(pc.green(`Created ${CONFIG_DIR}/`));
    }

    // Generate templates based on type
    const templates =
      flags.template === "monorepo"
        ? this.getMonorepoTemplates()
        : this.getMinimalTemplates();

    // Write workspaces.ts
    writeFileSync(workspacesFile, templates.workspaces);
    this.log(pc.green(`Created ${CONFIG_DIR}/${WORKSPACES_FILE}`));

    // Write cockpit.ts
    writeFileSync(taskFile, templates.tasks);
    this.log(pc.green(`Created ${TASK_FILE}`));

    this.log("");
    this.log(pc.bold("Cockpit initialized successfully!"));
    this.log("");
    this.log("Next steps:");
    this.log(
      `  1. Edit ${pc.cyan(`${CONFIG_DIR}/${WORKSPACES_FILE}`)} to define your workspaces`
    );
    this.log(`  2. Edit ${pc.cyan(TASK_FILE)} to define your tasks`);
    this.log(`  3. Run ${pc.cyan("cockpit list")} to see available tasks`);
    this.log(`  4. Run ${pc.cyan("cockpit run <task>")} to execute a task`);
  }

  private getMinimalTemplates(): { workspaces: string; tasks: string } {
    const workspaces = `import { defineWorkspaces } from "@maastrich/cockpit";

export default defineWorkspaces({
  // Define your workspaces here
  workspaces: {
    // example: { path: "packages/example" },
  },
  // Or use globs to auto-discover
  // globs: ["packages/*"],
});
`;

    const tasks = `import { defineConfig, task } from "@maastrich/cockpit";

export default defineConfig({
  tasks: {
    build: task("echo 'Add your build command'", {
      description: "Build the project",
    }),
    test: task("echo 'Add your test command'", {
      description: "Run tests",
      dependsOn: ["build"],
    }),
    lint: task("echo 'Add your lint command'", {
      description: "Run linter",
    }),
  },
});
`;

    return { workspaces, tasks };
  }

  private getMonorepoTemplates(): { workspaces: string; tasks: string } {
    const workspaces = `import { defineWorkspaces } from "@maastrich/cockpit";

export default defineWorkspaces({
  // Explicit workspace definitions
  workspaces: {
    // core: {
    //   path: "packages/core",
    //   tags: ["library"],
    // },
    // cli: {
    //   path: "packages/cli",
    //   dependsOn: ["core"],
    //   tags: ["app"],
    // },
  },

  // Auto-discover workspaces using globs
  globs: [
    "packages/*",
    "apps/*",
  ],

  // Default workspace when running from root
  // defaultWorkspace: "core",
});
`;

    const tasks = `import { defineConfig, task } from "@maastrich/cockpit";

export default defineConfig({
  tasks: {
    // Root-level tasks
    build: task("pnpm run build", {
      description: "Build the project",
      inputs: ["src/**/*.ts", "tsconfig.json"],
      outputs: ["dist/**"],
    }),

    test: task("pnpm run test", {
      description: "Run tests",
      dependsOn: ["build"],
    }),

    lint: task("pnpm run lint", {
      description: "Run linter",
    }),

    "type-check": task("pnpm run type-check", {
      description: "Type check",
    }),

    // CI task that runs everything
    ci: task("echo 'CI complete'", {
      description: "Run CI checks",
      dependsOn: ["lint", "type-check", "test"],
    }),
  },
});
`;

    return { workspaces, tasks };
  }
}
