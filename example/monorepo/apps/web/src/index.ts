/**
 * @example/web - Todo Web Application
 *
 * A simple web frontend for managing todos.
 */

import {
  createStore,
  type Todo,
  type CreateTodoInput,
  type Priority,
} from "@example/core";
import {
  formatDate,
  formatRelativeTime,
  getStatusEmoji,
  getPriorityEmoji,
  getCompletionPercentage,
  groupByStatus,
} from "@example/utils";

// Initialize the store
const store = createStore();

// DOM Elements
let todoList: HTMLElement;
let todoForm: HTMLFormElement;
let statsElement: HTMLElement;

/**
 * Initialize the application
 */
export function initApp(): void {
  // Get DOM elements
  todoList = document.getElementById("todo-list")!;
  todoForm = document.getElementById("todo-form") as HTMLFormElement;
  statsElement = document.getElementById("stats")!;

  // Set up event listeners
  todoForm.addEventListener("submit", handleSubmit);
  todoList.addEventListener("click", handleTodoClick);

  // Load sample data on first run
  if (store.list().length === 0) {
    loadSampleData();
  }

  // Render initial state
  render();
}

/**
 * Load sample todos for demo purposes
 */
function loadSampleData(): void {
  const sampleTodos: CreateTodoInput[] = [
    {
      title: "Learn TypeScript",
      description: "Complete the TypeScript handbook",
      priority: "high",
      tags: ["learning", "dev"],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    },
    {
      title: "Build a todo app",
      description: "Create a simple todo application with Cockpit",
      priority: "medium",
      tags: ["project", "dev"],
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    },
    {
      title: "Review pull requests",
      priority: "high",
      tags: ["work"],
    },
    {
      title: "Write documentation",
      description: "Document the API and usage examples",
      priority: "low",
      tags: ["docs"],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
    },
    {
      title: "Grocery shopping",
      priority: "medium",
      tags: ["personal"],
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
    },
  ];

  for (const input of sampleTodos) {
    store.create(input);
  }

  // Complete one todo for demo
  const todos = store.list();
  if (todos.length > 0) {
    store.update(todos[1].id, { status: "completed" });
    store.update(todos[2].id, { status: "in_progress" });
  }
}

/**
 * Handle form submission
 */
function handleSubmit(event: Event): void {
  event.preventDefault();

  const formData = new FormData(todoForm);
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as Priority;
  const dueDateStr = formData.get("dueDate") as string;

  if (!title.trim()) return;

  store.create({
    title,
    description: description || undefined,
    priority,
    dueDate: dueDateStr ? new Date(dueDateStr) : undefined,
  });

  todoForm.reset();
  render();
}

/**
 * Handle clicks on todo items
 */
function handleTodoClick(event: Event): void {
  const target = event.target as HTMLElement;
  const todoItem = target.closest("[data-todo-id]") as HTMLElement;

  if (!todoItem) return;

  const todoId = todoItem.dataset.todoId!;

  // Handle status toggle
  if (target.classList.contains("todo-checkbox")) {
    const todo = store.get(todoId);
    if (todo) {
      const newStatus = todo.status === "completed" ? "pending" : "completed";
      store.update(todoId, { status: newStatus });
      render();
    }
  }

  // Handle delete
  if (target.classList.contains("todo-delete")) {
    store.delete(todoId);
    render();
  }

  // Handle start
  if (target.classList.contains("todo-start")) {
    store.update(todoId, { status: "in_progress" });
    render();
  }
}

/**
 * Render the todo list
 */
function render(): void {
  const todos = store.list();
  const groups = groupByStatus(todos);

  // Render stats
  const stats = store.getStats();
  const completion = getCompletionPercentage(todos);

  statsElement.innerHTML = `
    <div class="stat">
      <span class="stat-value">${stats.total}</span>
      <span class="stat-label">Total</span>
    </div>
    <div class="stat">
      <span class="stat-value">${stats.pending}</span>
      <span class="stat-label">Pending</span>
    </div>
    <div class="stat">
      <span class="stat-value">${stats.in_progress}</span>
      <span class="stat-label">In Progress</span>
    </div>
    <div class="stat">
      <span class="stat-value">${stats.completed}</span>
      <span class="stat-label">Completed</span>
    </div>
    <div class="stat">
      <span class="stat-value">${completion}%</span>
      <span class="stat-label">Done</span>
    </div>
  `;

  // Render todo list
  const activeGroups = [
    { title: "In Progress", todos: groups.in_progress },
    { title: "Pending", todos: groups.pending },
    { title: "Completed", todos: groups.completed },
  ].filter((g) => g.todos.length > 0);

  todoList.innerHTML = activeGroups
    .map(
      (group) => `
      <div class="todo-group">
        <h3 class="todo-group-title">${group.title} (${group.todos.length})</h3>
        ${group.todos.map((todo) => renderTodo(todo)).join("")}
      </div>
    `,
    )
    .join("");
}

/**
 * Render a single todo item
 */
function renderTodo(todo: Todo): string {
  const isCompleted = todo.status === "completed";
  const statusEmoji = getStatusEmoji(todo.status);
  const priorityEmoji = getPriorityEmoji(todo.priority);

  let dueDateHtml = "";
  if (todo.dueDate) {
    const isOverdue = todo.dueDate < new Date() && !isCompleted;
    dueDateHtml = `
      <span class="todo-due ${isOverdue ? "overdue" : ""}">
        ${formatRelativeTime(todo.dueDate)}
      </span>
    `;
  }

  return `
    <div class="todo-item ${isCompleted ? "completed" : ""}" data-todo-id="${todo.id}">
      <button class="todo-checkbox" title="Toggle complete">
        ${statusEmoji}
      </button>
      <div class="todo-content">
        <div class="todo-header">
          <span class="todo-title">${todo.title}</span>
          <span class="todo-priority">${priorityEmoji}</span>
        </div>
        ${todo.description ? `<p class="todo-description">${todo.description}</p>` : ""}
        <div class="todo-meta">
          ${dueDateHtml}
          ${todo.tags.length > 0 ? `<span class="todo-tags">${todo.tags.map((t) => `#${t}`).join(" ")}</span>` : ""}
          <span class="todo-created">Created ${formatDate(todo.createdAt)}</span>
        </div>
      </div>
      <div class="todo-actions">
        ${todo.status === "pending" ? `<button class="todo-start" title="Start working">Start</button>` : ""}
        <button class="todo-delete" title="Delete">Delete</button>
      </div>
    </div>
  `;
}

// Auto-initialize when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}

export { store };
