/**
 * Priority levels for todos
 */
export type Priority = "low" | "medium" | "high";

/**
 * Status of a todo item
 */
export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

/**
 * A todo item
 */
export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: Priority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
}

/**
 * Input for creating a new todo
 */
export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: Priority;
  tags?: string[];
  dueDate?: Date;
}

/**
 * Input for updating an existing todo
 */
export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: Priority;
  tags?: string[];
  dueDate?: Date;
}

/**
 * Filter options for querying todos
 */
export interface TodoFilter {
  status?: TodoStatus | TodoStatus[];
  priority?: Priority | Priority[];
  tags?: string[];
  search?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

/**
 * Sort options for todos
 */
export interface TodoSort {
  field: "createdAt" | "updatedAt" | "dueDate" | "priority" | "title";
  direction: "asc" | "desc";
}
