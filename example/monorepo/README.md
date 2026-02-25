# Todo App - Cockpit Example Monorepo

A complete Todo application demonstrating `@maastrich/cockpit` task manager features.

## What's Included

This monorepo contains a fully functional todo application with:

- **@example/core** - Core domain logic (types, validation, store)
- **@example/utils** - Utility functions (date formatting, display helpers)
- **@example/web** - Web frontend (vanilla TypeScript, no framework)
- **@example/cli** - Command-line interface for managing todos

## Structure

```
example/
├── .cockpit/
│   └── workspaces.ts       # Workspace definitions
├── cockpit.ts              # Root-level orchestration tasks
├── packages/
│   ├── core/               # Core library
│   │   ├── cockpit.ts
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── validation.ts
│   │       ├── store.ts
│   │       └── store.test.ts
│   └── utils/              # Utility library
│       ├── cockpit.ts
│       ├── package.json
│       └── src/
│           ├── index.ts
│           └── index.test.ts
└── apps/
    ├── web/                # Web application
    │   ├── cockpit.ts
    │   ├── package.json
    │   ├── public/
    │   │   ├── index.html
    │   │   └── styles.css
    │   └── src/
    │       └── index.ts
    └── cli/                # CLI application
        ├── cockpit.ts
        ├── package.json
        └── src/
            └── index.ts
```

## Quick Start

```bash
# From the cockpit project root
cd example

# Install dependencies
pnpm install

# Build all packages
../bin/run.js run build:all

# Run tests
../bin/run.js run test:all

# Run the full CI pipeline
../bin/run.js run ci
```

## Features Demonstrated

### 1. Workspace Configuration

See `.cockpit/workspaces.ts` for:
- Explicit workspace definitions with paths
- Tags for filtering (`library`, `app`, `frontend`, `cli`)
- Cross-workspace dependencies

### 2. Task Definitions

Each `cockpit.ts` file demonstrates:
- Real TypeScript build commands (`pnpm tsc`)
- Task dependencies (local and cross-workspace)
- Input/output declarations for caching
- Clean tasks for removing build artifacts

### 3. Cross-Workspace Dependencies

```typescript
// In utils/cockpit.ts
build: task("pnpm tsc", {
  dependsOn: ["core:build"],  // Build core first
})

// In web/cockpit.ts
build: task("pnpm tsc", {
  dependsOn: ["core:build", "utils:build"],  // Build libraries first
})
```

### 4. Dependency Graph

```
                    ┌─────────┐
                    │  core   │
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │  utils  │
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │                     │
         ┌────┴────┐          ┌────┴────┐
         │   web   │          │   cli   │
         └─────────┘          └─────────┘
```

## Todo App Features

### Core Package (`@example/core`)

- `Todo` type with status, priority, tags, due dates
- `TodoStore` for CRUD operations
- Validation with detailed error messages
- Filtering and sorting
- Import/export for persistence

### Utils Package (`@example/utils`)

- Date formatting (`formatDate`, `formatRelativeTime`, `isOverdue`)
- Text utilities (`truncate`, `slugify`, `capitalize`)
- Display helpers (`getStatusEmoji`, `getPriorityColor`)
- Todo grouping and statistics

### Web App (`@example/web`)

A dark-themed web interface with:
- Add new todos with title, description, priority, due date
- View todos grouped by status
- Mark todos as complete or start working
- Delete todos
- Live statistics display

### CLI App (`@example/cli`)

A terminal interface with:
```bash
# List all todos
node dist/index.js list

# Add a new todo
node dist/index.js add "Buy groceries" -p high -t shopping,personal

# Start working on a todo
node dist/index.js start abc123

# Complete a todo
node dist/index.js done abc123

# Show statistics
node dist/index.js stats

# Get help
node dist/index.js help
```

## Example Commands

```bash
# List all workspaces and tasks
../bin/run.js list

# Build just core
../bin/run.js run build --workspace=core

# Build all libraries
../bin/run.js run build --tag=library

# Run tests with verbose output
../bin/run.js run test:all --verbose

# Force rebuild (skip cache)
../bin/run.js run build:all --force

# Clean all build outputs
../bin/run.js run clean:all
```

## Development

After building, you can:

1. **Run the CLI:**
   ```bash
   node apps/cli/dist/index.js help
   node apps/cli/dist/index.js add "My first todo"
   node apps/cli/dist/index.js list
   ```

2. **View the web app:**
   ```bash
   cd apps/web
   npx serve public
   # Open http://localhost:3000
   ```
