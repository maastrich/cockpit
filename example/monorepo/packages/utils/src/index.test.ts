import { describe, it, expect } from "bun:test";
import {
  formatDate,
  formatDateShort,
  isOverdue,
  isDueToday,
  slugify,
  truncate,
  capitalize,
  titleCase,
  getPriorityColor,
  getStatusEmoji,
  groupByStatus,
  getCompletionPercentage,
} from "./index.js";
import type { Todo } from "@example/core";

describe("Date Utilities", () => {
  it("should format date correctly", () => {
    const date = new Date("2025-06-15");
    expect(formatDate(date)).toBe("June 15, 2025");
  });

  it("should format short date correctly", () => {
    const date = new Date("2025-06-15");
    expect(formatDateShort(date)).toBe("Jun 15");
  });

  it("should detect overdue dates", () => {
    const pastDate = new Date(Date.now() - 86400000);
    const futureDate = new Date(Date.now() + 86400000);

    expect(isOverdue(pastDate)).toBe(true);
    expect(isOverdue(futureDate)).toBe(false);
  });

  it("should detect dates due today", () => {
    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);

    expect(isDueToday(today)).toBe(true);
    expect(isDueToday(tomorrow)).toBe(false);
  });
});

describe("Text Utilities", () => {
  it("should slugify text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("This is a TEST!")).toBe("this-is-a-test");
  });

  it("should truncate text", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("should capitalize text", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("WORLD")).toBe("WORLD");
    expect(capitalize("")).toBe("");
  });

  it("should title case text", () => {
    expect(titleCase("hello world")).toBe("Hello World");
  });
});

describe("Todo Utilities", () => {
  it("should return correct priority colors", () => {
    expect(getPriorityColor("high")).toBe("#ef4444");
    expect(getPriorityColor("medium")).toBe("#f59e0b");
    expect(getPriorityColor("low")).toBe("#22c55e");
  });

  it("should return correct status emojis", () => {
    expect(getStatusEmoji("pending")).toBe("⏳");
    expect(getStatusEmoji("completed")).toBe("✅");
  });

  it("should group todos by status", () => {
    const todos: Todo[] = [
      createMockTodo({ status: "pending" }),
      createMockTodo({ status: "pending" }),
      createMockTodo({ status: "completed" }),
    ];

    const groups = groupByStatus(todos);

    expect(groups.pending).toHaveLength(2);
    expect(groups.completed).toHaveLength(1);
    expect(groups.in_progress).toHaveLength(0);
  });

  it("should calculate completion percentage", () => {
    const todos: Todo[] = [
      createMockTodo({ status: "completed" }),
      createMockTodo({ status: "completed" }),
      createMockTodo({ status: "pending" }),
      createMockTodo({ status: "pending" }),
    ];

    expect(getCompletionPercentage(todos)).toBe(50);
    expect(getCompletionPercentage([])).toBe(0);
  });
});

function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: `todo_${Math.random().toString(36).slice(2)}`,
    title: "Test Todo",
    status: "pending",
    priority: "medium",
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
