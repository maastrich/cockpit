import { describe, it, expect, beforeEach } from "bun:test";
import { TodoStore, createStore } from "./store.js";

describe("TodoStore", () => {
  let store: TodoStore;

  beforeEach(() => {
    store = createStore();
  });

  describe("create", () => {
    it("should create a todo with required fields", () => {
      const todo = store.create({ title: "Test todo" });

      expect(todo.id).toBeDefined();
      expect(todo.title).toBe("Test todo");
      expect(todo.status).toBe("pending");
      expect(todo.priority).toBe("medium");
      expect(todo.tags).toEqual([]);
    });

    it("should create a todo with all fields", () => {
      const dueDate = new Date("2025-12-31");
      const todo = store.create({
        title: "Full todo",
        description: "A complete todo",
        priority: "high",
        tags: ["work", "urgent"],
        dueDate,
      });

      expect(todo.title).toBe("Full todo");
      expect(todo.description).toBe("A complete todo");
      expect(todo.priority).toBe("high");
      expect(todo.tags).toEqual(["work", "urgent"]);
      expect(todo.dueDate).toEqual(dueDate);
    });

    it("should throw on empty title", () => {
      expect(() => store.create({ title: "" })).toThrow("Validation failed");
    });
  });

  describe("get", () => {
    it("should return a todo by id", () => {
      const created = store.create({ title: "Test" });
      const found = store.get(created.id);

      expect(found).toEqual(created);
    });

    it("should return undefined for non-existent id", () => {
      const found = store.get("non-existent");
      expect(found).toBeUndefined();
    });
  });

  describe("update", () => {
    it("should update todo fields", () => {
      const todo = store.create({ title: "Original" });
      const updated = store.update(todo.id, {
        title: "Updated",
        priority: "high",
      });

      expect(updated.title).toBe("Updated");
      expect(updated.priority).toBe("high");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(todo.createdAt.getTime());
    });

    it("should set completedAt when status changes to completed", () => {
      const todo = store.create({ title: "Test" });
      expect(todo.completedAt).toBeUndefined();

      const updated = store.update(todo.id, { status: "completed" });
      expect(updated.completedAt).toBeDefined();
    });

    it("should throw for non-existent todo", () => {
      expect(() => store.update("fake-id", { title: "Test" })).toThrow("Todo not found");
    });
  });

  describe("delete", () => {
    it("should delete a todo", () => {
      const todo = store.create({ title: "Test" });
      const result = store.delete(todo.id);

      expect(result).toBe(true);
      expect(store.get(todo.id)).toBeUndefined();
    });

    it("should return false for non-existent todo", () => {
      const result = store.delete("fake-id");
      expect(result).toBe(false);
    });
  });

  describe("list", () => {
    beforeEach(() => {
      store.create({ title: "Low priority", priority: "low", tags: ["personal"] });
      store.create({ title: "High priority", priority: "high", tags: ["work"] });
      store.create({ title: "Medium todo", priority: "medium", tags: ["work", "personal"] });
    });

    it("should list all todos", () => {
      const todos = store.list();
      expect(todos).toHaveLength(3);
    });

    it("should filter by priority", () => {
      const todos = store.list({ priority: "high" });
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe("High priority");
    });

    it("should filter by tags", () => {
      const todos = store.list({ tags: ["work"] });
      expect(todos).toHaveLength(2);
    });

    it("should search by title", () => {
      const todos = store.list({ search: "Medium" });
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe("Medium todo");
    });

    it("should sort by priority", () => {
      const todos = store.list(undefined, { field: "priority", direction: "desc" });
      expect(todos[0].priority).toBe("high");
      expect(todos[2].priority).toBe("low");
    });
  });

  describe("getStats", () => {
    it("should return correct stats", () => {
      store.create({ title: "Todo 1" });
      store.create({ title: "Todo 2" });
      const todo3 = store.create({ title: "Todo 3" });
      store.update(todo3.id, { status: "completed" });

      const stats = store.getStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(1);
    });
  });

  describe("export/import", () => {
    it("should export and import todos", () => {
      store.create({ title: "Todo 1" });
      store.create({ title: "Todo 2" });

      const exported = store.export();
      const newStore = createStore();
      newStore.import(exported);

      expect(newStore.list()).toHaveLength(2);
    });
  });
});
