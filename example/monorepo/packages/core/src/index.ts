/**
 * @example/core - Todo App Core Library
 *
 * Core domain logic, types, and validation for the todo application.
 */

// Types
export type {
  Todo,
  TodoStatus,
  Priority,
  CreateTodoInput,
  UpdateTodoInput,
  TodoFilter,
  TodoSort,
} from "./types.js";

// Validation
export {
  validateCreateTodo,
  validateUpdateTodo,
  type ValidationError,
  type ValidationResult,
} from "./validation.js";

// Store
export { TodoStore, createStore } from "./store.js";

export const VERSION = "1.0.0";
