#!/usr/bin/env node
/**
 * @example/cli - Todo CLI Application
 *
 * A command-line tool for managing todos.
 */

import { createStore, VERSION, type Priority, type TodoStatus } from "@example/core";
import {
  formatDate,
  truncate,
  getStatusEmoji,
  getPriorityEmoji,
  getCompletionPercentage,
} from "@example/utils";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Data file location
const DATA_DIR = path.join(os.homedir(), ".todo-app");
const DATA_FILE = path.join(DATA_DIR, "todos.json");

// Initialize store
const store = createStore();

// Load existing todos
function loadTodos(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      store.import(data);
    }
  } catch {
    // Ignore errors, start fresh
  }
}

// Save todos to file
function saveTodos(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store.export(), null, 2));
  } catch (err) {
    console.error("Failed to save todos:", err);
  }
}

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// Commands
function listTodos(filter?: string): void {
  const todos = store.list();

  if (todos.length === 0) {
    console.log(colorize("\nNo todos yet. Add one with: todo add <title>\n", "dim"));
    return;
  }

  // Apply filter if provided
  let filtered = todos;
  if (filter) {
    const lowerFilter = filter.toLowerCase();
    filtered = todos.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerFilter) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lowerFilter)) ||
        t.status === lowerFilter ||
        t.priority === lowerFilter
    );
  }

  if (filtered.length === 0) {
    console.log(colorize(`\nNo todos matching "${filter}"\n`, "dim"));
    return;
  }

  const stats = store.getStats();
  const completion = getCompletionPercentage(todos);

  console.log();
  console.log(
    colorize(`Todo List`, "bold") +
      colorize(` (${stats.total} total, ${completion}% complete)`, "dim")
  );
  console.log(colorize("─".repeat(60), "dim"));

  for (const todo of filtered) {
    const statusEmoji = getStatusEmoji(todo.status);
    const priorityEmoji = getPriorityEmoji(todo.priority);
    const title =
      todo.status === "completed"
        ? colorize(todo.title, "dim")
        : todo.title;

    const id = colorize(`[${todo.id.slice(-6)}]`, "gray");
    const tags =
      todo.tags.length > 0
        ? colorize(` ${todo.tags.map((t) => `#${t}`).join(" ")}`, "cyan")
        : "";

    console.log(`${statusEmoji} ${priorityEmoji} ${title}${tags} ${id}`);

    if (todo.description) {
      console.log(colorize(`   ${truncate(todo.description, 55)}`, "dim"));
    }
    if (todo.dueDate) {
      const isOverdue = todo.dueDate < new Date() && todo.status !== "completed";
      const dueText = `   Due: ${formatDate(todo.dueDate)}`;
      console.log(isOverdue ? colorize(dueText, "red") : colorize(dueText, "dim"));
    }
  }

  console.log();
}

function addTodo(args: string[]): void {
  if (args.length === 0) {
    console.log(colorize("Usage: todo add <title> [-p high|medium|low] [-t tag1,tag2]", "yellow"));
    return;
  }

  let title = "";
  let priority: Priority = "medium";
  let tags: string[] = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-p" && args[i + 1]) {
      priority = args[i + 1] as Priority;
      i++;
    } else if (args[i] === "-t" && args[i + 1]) {
      tags = args[i + 1].split(",").map((t) => t.trim());
      i++;
    } else {
      title += (title ? " " : "") + args[i];
    }
  }

  if (!title) {
    console.log(colorize("Title is required", "red"));
    return;
  }

  const todo = store.create({ title, priority, tags });
  saveTodos();

  console.log(colorize("\nTodo created:", "green"));
  console.log(`  ${getStatusEmoji(todo.status)} ${todo.title}`);
  console.log(colorize(`  ID: ${todo.id}`, "dim"));
  console.log();
}

function completeTodo(idFragment: string): void {
  const todo = findTodoByFragment(idFragment);
  if (!todo) return;

  store.update(todo.id, { status: "completed" });
  saveTodos();

  console.log(colorize("\nMarked as complete:", "green"));
  console.log(`  ${getStatusEmoji("completed")} ${todo.title}`);
  console.log();
}

function startTodo(idFragment: string): void {
  const todo = findTodoByFragment(idFragment);
  if (!todo) return;

  store.update(todo.id, { status: "in_progress" });
  saveTodos();

  console.log(colorize("\nStarted working on:", "blue"));
  console.log(`  ${getStatusEmoji("in_progress")} ${todo.title}`);
  console.log();
}

function deleteTodo(idFragment: string): void {
  const todo = findTodoByFragment(idFragment);
  if (!todo) return;

  store.delete(todo.id);
  saveTodos();

  console.log(colorize("\nDeleted:", "red"));
  console.log(`  ${todo.title}`);
  console.log();
}

function showStats(): void {
  const todos = store.list();
  const stats = store.getStats();
  const completion = getCompletionPercentage(todos);

  console.log();
  console.log(colorize("Todo Statistics", "bold"));
  console.log(colorize("─".repeat(30), "dim"));
  console.log(`Total:       ${colorize(String(stats.total), "bold")}`);
  console.log(`Pending:     ${colorize(String(stats.pending), "yellow")}`);
  console.log(`In Progress: ${colorize(String(stats.in_progress), "blue")}`);
  console.log(`Completed:   ${colorize(String(stats.completed), "green")}`);
  console.log(`Cancelled:   ${colorize(String(stats.cancelled), "red")}`);
  console.log();
  console.log(`Completion:  ${colorize(`${completion}%`, "cyan")}`);
  console.log();
}

function clearCompleted(): void {
  const todos = store.list({ status: "completed" });
  for (const todo of todos) {
    store.delete(todo.id);
  }
  saveTodos();

  console.log(colorize(`\nCleared ${todos.length} completed todos\n`, "green"));
}

function findTodoByFragment(fragment: string): ReturnType<typeof store.get> {
  const todos = store.list();
  const matches = todos.filter((t) => t.id.includes(fragment));

  if (matches.length === 0) {
    console.log(colorize(`\nNo todo found matching "${fragment}"\n`, "red"));
    return undefined;
  }

  if (matches.length > 1) {
    console.log(colorize(`\nMultiple todos match "${fragment}":`, "yellow"));
    for (const todo of matches) {
      console.log(`  ${todo.id.slice(-6)}: ${truncate(todo.title, 40)}`);
    }
    console.log(colorize("\nPlease use a more specific ID fragment\n", "dim"));
    return undefined;
  }

  return matches[0];
}

function showHelp(): void {
  console.log(`
${colorize("Todo CLI", "bold")} ${colorize(`v${VERSION}`, "dim")}

${colorize("Usage:", "yellow")}
  todo <command> [arguments]

${colorize("Commands:", "yellow")}
  ${colorize("list", "cyan")} [filter]           List todos (optionally filtered)
  ${colorize("add", "cyan")} <title> [options]  Add a new todo
      -p <priority>       Set priority (high, medium, low)
      -t <tags>           Add tags (comma-separated)
  ${colorize("done", "cyan")} <id>              Mark todo as complete
  ${colorize("start", "cyan")} <id>             Start working on a todo
  ${colorize("delete", "cyan")} <id>            Delete a todo
  ${colorize("stats", "cyan")}                  Show statistics
  ${colorize("clear", "cyan")}                  Remove all completed todos
  ${colorize("help", "cyan")}                   Show this help

${colorize("Examples:", "yellow")}
  todo add "Buy groceries" -p high -t shopping,personal
  todo list pending
  todo done abc123
  todo stats
`);
}

// Main entry point
export function main(args: string[]): void {
  loadTodos();

  const command = args[0] || "list";
  const restArgs = args.slice(1);

  switch (command) {
    case "list":
    case "ls":
      listTodos(restArgs[0]);
      break;

    case "add":
    case "new":
      addTodo(restArgs);
      break;

    case "done":
    case "complete":
      if (!restArgs[0]) {
        console.log(colorize("Usage: todo done <id>", "yellow"));
      } else {
        completeTodo(restArgs[0]);
      }
      break;

    case "start":
      if (!restArgs[0]) {
        console.log(colorize("Usage: todo start <id>", "yellow"));
      } else {
        startTodo(restArgs[0]);
      }
      break;

    case "delete":
    case "rm":
      if (!restArgs[0]) {
        console.log(colorize("Usage: todo delete <id>", "yellow"));
      } else {
        deleteTodo(restArgs[0]);
      }
      break;

    case "stats":
      showStats();
      break;

    case "clear":
      clearCompleted();
      break;

    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;

    default:
      console.log(colorize(`Unknown command: ${command}`, "red"));
      console.log(colorize('Run "todo help" for usage information', "dim"));
  }
}

// Run if executed directly
main(process.argv.slice(2));
