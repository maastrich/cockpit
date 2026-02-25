import { describe, it, expect } from "bun:test";
import { defineConfig, defineWorkspaces, task } from "../src/index.js";

describe("cockpit", () => {
  it("should export defineConfig", () => {
    expect(defineConfig).toBeDefined();
    expect(typeof defineConfig).toBe("function");
  });

  it("should export defineWorkspaces", () => {
    expect(defineWorkspaces).toBeDefined();
    expect(typeof defineWorkspaces).toBe("function");
  });

  it("should export task", () => {
    expect(task).toBeDefined();
    expect(typeof task).toBe("function");
  });

  it("should create a valid config with defineConfig", () => {
    const config = defineConfig({
      tasks: {
        build: task("echo build"),
        test: task("echo test", { dependsOn: ["build"] }),
      },
    });

    expect(config.tasks.build).toBeDefined();
    expect(config.tasks.test).toBeDefined();
    expect(config.tasks.test.dependsOn).toEqual(["build"]);
  });

  it("should create a valid workspace config with defineWorkspaces", () => {
    const config = defineWorkspaces({
      workspaces: {
        core: { path: "packages/core" },
        cli: { path: "packages/cli", dependsOn: ["core"] },
      },
      globs: ["apps/*"],
    });

    expect(config.workspaces?.core).toBeDefined();
    expect(config.workspaces?.cli.dependsOn).toEqual(["core"]);
    expect(config.globs).toEqual(["apps/*"]);
  });
});
