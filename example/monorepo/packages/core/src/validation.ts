import type { CreateTodoInput, UpdateTodoInput, Priority, TodoStatus } from "./types.js";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const VALID_PRIORITIES: Priority[] = ["low", "medium", "high"];
const VALID_STATUSES: TodoStatus[] = ["pending", "in_progress", "completed", "cancelled"];

/**
 * Validates a create todo input
 */
export function validateCreateTodo(input: CreateTodoInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  if (!input.title || input.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (input.title.length > 200) {
    errors.push({ field: "title", message: "Title must be 200 characters or less" });
  }

  // Description validation
  if (input.description && input.description.length > 2000) {
    errors.push({ field: "description", message: "Description must be 2000 characters or less" });
  }

  // Priority validation
  if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
    errors.push({ field: "priority", message: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}` });
  }

  // Tags validation
  if (input.tags) {
    if (!Array.isArray(input.tags)) {
      errors.push({ field: "tags", message: "Tags must be an array" });
    } else if (input.tags.length > 10) {
      errors.push({ field: "tags", message: "Maximum 10 tags allowed" });
    } else {
      for (const tag of input.tags) {
        if (typeof tag !== "string" || tag.length > 50) {
          errors.push({ field: "tags", message: "Each tag must be a string of 50 characters or less" });
          break;
        }
      }
    }
  }

  // Due date validation
  if (input.dueDate && !(input.dueDate instanceof Date)) {
    errors.push({ field: "dueDate", message: "Due date must be a valid Date object" });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates an update todo input
 */
export function validateUpdateTodo(input: UpdateTodoInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation (optional but must be valid if provided)
  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      errors.push({ field: "title", message: "Title cannot be empty" });
    } else if (input.title.length > 200) {
      errors.push({ field: "title", message: "Title must be 200 characters or less" });
    }
  }

  // Description validation
  if (input.description !== undefined && input.description.length > 2000) {
    errors.push({ field: "description", message: "Description must be 2000 characters or less" });
  }

  // Status validation
  if (input.status && !VALID_STATUSES.includes(input.status)) {
    errors.push({ field: "status", message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  // Priority validation
  if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
    errors.push({ field: "priority", message: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}` });
  }

  // Tags validation
  if (input.tags) {
    if (!Array.isArray(input.tags)) {
      errors.push({ field: "tags", message: "Tags must be an array" });
    } else if (input.tags.length > 10) {
      errors.push({ field: "tags", message: "Maximum 10 tags allowed" });
    }
  }

  return { valid: errors.length === 0, errors };
}
