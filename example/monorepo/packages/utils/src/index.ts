/**
 * @example/utils - Utility functions
 *
 * Common utilities used across the todo application.
 */

import type { Todo, Priority, TodoStatus } from "@example/core";

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a date as a human-readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date as a short string (e.g., "Jan 15")
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date relative to now (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  if (diffHours < 0) return `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? "s" : ""} ago`;
  if (diffMinutes > 0) return `in ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
  if (diffMinutes < 0) return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? "s" : ""} ago`;
  return "just now";
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is due today
 */
export function isDueToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// ============================================================================
// Text Utilities
// ============================================================================

/**
 * Slugify text for URL-safe strings
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a string to title case
 */
export function titleCase(text: string): string {
  return text
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

// ============================================================================
// Todo Utilities
// ============================================================================

/**
 * Get the display color for a priority
 */
export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case "high":
      return "#ef4444"; // red
    case "medium":
      return "#f59e0b"; // amber
    case "low":
      return "#22c55e"; // green
  }
}

/**
 * Get the display label for a priority
 */
export function getPriorityLabel(priority: Priority): string {
  return capitalize(priority);
}

/**
 * Get the display color for a status
 */
export function getStatusColor(status: TodoStatus): string {
  switch (status) {
    case "pending":
      return "#6b7280"; // gray
    case "in_progress":
      return "#3b82f6"; // blue
    case "completed":
      return "#22c55e"; // green
    case "cancelled":
      return "#ef4444"; // red
  }
}

/**
 * Get the display label for a status
 */
export function getStatusLabel(status: TodoStatus): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    default:
      return capitalize(status);
  }
}

/**
 * Get the display emoji for a status
 */
export function getStatusEmoji(status: TodoStatus): string {
  switch (status) {
    case "pending":
      return "⏳";
    case "in_progress":
      return "🔄";
    case "completed":
      return "✅";
    case "cancelled":
      return "❌";
  }
}

/**
 * Get the display emoji for a priority
 */
export function getPriorityEmoji(priority: Priority): string {
  switch (priority) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
  }
}

/**
 * Group todos by status
 */
export function groupByStatus(todos: Todo[]): Record<TodoStatus, Todo[]> {
  const groups: Record<TodoStatus, Todo[]> = {
    pending: [],
    in_progress: [],
    completed: [],
    cancelled: [],
  };

  for (const todo of todos) {
    groups[todo.status].push(todo);
  }

  return groups;
}

/**
 * Group todos by priority
 */
export function groupByPriority(todos: Todo[]): Record<Priority, Todo[]> {
  const groups: Record<Priority, Todo[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const todo of todos) {
    groups[todo.priority].push(todo);
  }

  return groups;
}

/**
 * Get overdue todos
 */
export function getOverdueTodos(todos: Todo[]): Todo[] {
  const now = new Date();
  return todos.filter(
    (todo) =>
      todo.dueDate &&
      todo.dueDate < now &&
      todo.status !== "completed" &&
      todo.status !== "cancelled"
  );
}

/**
 * Get todos due today
 */
export function getTodosDueToday(todos: Todo[]): Todo[] {
  return todos.filter(
    (todo) =>
      todo.dueDate &&
      isDueToday(todo.dueDate) &&
      todo.status !== "completed" &&
      todo.status !== "cancelled"
  );
}

/**
 * Calculate completion percentage
 */
export function getCompletionPercentage(todos: Todo[]): number {
  if (todos.length === 0) return 0;
  const completed = todos.filter((t) => t.status === "completed").length;
  return Math.round((completed / todos.length) * 100);
}
