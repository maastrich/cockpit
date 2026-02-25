import type { Todo, CreateTodoInput, UpdateTodoInput, TodoFilter, TodoSort } from "./types.js";
import { validateCreateTodo, validateUpdateTodo } from "./validation.js";

/**
 * Generates a unique ID for a todo
 */
function generateId(): string {
  return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * In-memory todo store
 */
export class TodoStore {
  private todos: Map<string, Todo> = new Map();

  /**
   * Create a new todo
   */
  create(input: CreateTodoInput): Todo {
    const validation = validateCreateTodo(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(", ")}`);
    }

    const now = new Date();
    const todo: Todo = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description?.trim(),
      status: "pending",
      priority: input.priority ?? "medium",
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      dueDate: input.dueDate,
    };

    this.todos.set(todo.id, todo);
    return todo;
  }

  /**
   * Get a todo by ID
   */
  get(id: string): Todo | undefined {
    return this.todos.get(id);
  }

  /**
   * Update an existing todo
   */
  update(id: string, input: UpdateTodoInput): Todo {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new Error(`Todo not found: ${id}`);
    }

    const validation = validateUpdateTodo(input);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(", ")}`);
    }

    const now = new Date();
    const updated: Todo = {
      ...todo,
      title: input.title?.trim() ?? todo.title,
      description: input.description !== undefined ? input.description?.trim() : todo.description,
      status: input.status ?? todo.status,
      priority: input.priority ?? todo.priority,
      tags: input.tags ?? todo.tags,
      dueDate: input.dueDate !== undefined ? input.dueDate : todo.dueDate,
      updatedAt: now,
      completedAt: input.status === "completed" && todo.status !== "completed" ? now : todo.completedAt,
    };

    this.todos.set(id, updated);
    return updated;
  }

  /**
   * Delete a todo
   */
  delete(id: string): boolean {
    return this.todos.delete(id);
  }

  /**
   * List all todos with optional filtering and sorting
   */
  list(filter?: TodoFilter, sort?: TodoSort): Todo[] {
    let results = Array.from(this.todos.values());

    // Apply filters
    if (filter) {
      results = this.applyFilter(results, filter);
    }

    // Apply sorting
    if (sort) {
      results = this.applySort(results, sort);
    } else {
      // Default sort by createdAt descending
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return results;
  }

  /**
   * Get count of todos by status
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const todo of this.todos.values()) {
      stats.total++;
      stats[todo.status]++;
    }

    return stats;
  }

  /**
   * Clear all todos
   */
  clear(): void {
    this.todos.clear();
  }

  /**
   * Export todos as JSON-serializable array
   */
  export(): Todo[] {
    return Array.from(this.todos.values());
  }

  /**
   * Import todos from an array
   */
  import(todos: Todo[]): void {
    for (const todo of todos) {
      this.todos.set(todo.id, {
        ...todo,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
        dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
        completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
      });
    }
  }

  private applyFilter(todos: Todo[], filter: TodoFilter): Todo[] {
    return todos.filter(todo => {
      // Status filter
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        if (!statuses.includes(todo.status)) return false;
      }

      // Priority filter
      if (filter.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        if (!priorities.includes(todo.priority)) return false;
      }

      // Tags filter (match any)
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => todo.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Search filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const titleMatch = todo.title.toLowerCase().includes(searchLower);
        const descMatch = todo.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) return false;
      }

      // Due date filters
      if (filter.dueBefore && todo.dueDate) {
        if (todo.dueDate > filter.dueBefore) return false;
      }
      if (filter.dueAfter && todo.dueDate) {
        if (todo.dueDate < filter.dueAfter) return false;
      }

      return true;
    });
  }

  private applySort(todos: Todo[], sort: TodoSort): Todo[] {
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };

    return [...todos].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "priority":
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "updatedAt":
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = a.dueDate.getTime() - b.dueDate.getTime();
          break;
      }

      return sort.direction === "desc" ? -comparison : comparison;
    });
  }
}

/**
 * Create a new TodoStore instance
 */
export function createStore(): TodoStore {
  return new TodoStore();
}
