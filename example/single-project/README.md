# Single Project Example

This example demonstrates using `@maastrich/cockpit` in a simple single-project setup (not a monorepo).

## Structure

```
single-project/
├── cockpit.ts          # Task configuration
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Main exports
    ├── calculator.ts   # Calculator class
    ├── operations.ts   # Math operations
    ├── types.ts        # TypeScript types
    └── calculator.test.ts
```

## Setup

```bash
cd example/single-project
pnpm install
```

## Usage

```bash
# List available tasks
cockpit list

# Build the project
cockpit run build

# Run tests
cockpit run test

# Run linting
cockpit run lint

# Run full CI pipeline
cockpit run ci

# Clean build outputs
cockpit run clean

# Start development mode
cockpit run dev
```

## Key Differences from Monorepo

In a single project:
- Still need a `.cockpit/` directory (can be empty) to mark the project root
- No `.cockpit/workspaces.ts` file needed
- All tasks are defined at the root level in `cockpit.ts`
- No workspace prefixes (just `cockpit run build`, not `cockpit run core:build`)
- Task dependencies are simpler (no cross-workspace deps)
