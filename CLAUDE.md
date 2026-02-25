# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

@maastrich/cockpit is a CLI tool to manage repository commands, built with the oclif framework. It uses TypeScript with strict mode, ESM modules, and requires Node.js 18+ with pnpm 10.24.0+.

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (watch mode with live compilation)
pnpm run dev

# Build (one-time build)
pnpm run build

# Run tests (Bun)
pnpm run test

# Type checking
pnpm run type-check        # Both lib and tests
pnpm run type-check:lib    # Library only
pnpm run type-check:tests  # Tests only

# Linting (three-tool setup)
pnpm run lint              # Run all linters
pnpm run lint:fix          # Auto-fix issues

# Formatting
pnpm run format            # Check formatting
pnpm run format:fix        # Auto-format code

# Pre-publish validation (runs format, type-check, lint)
pnpm run prepublishOnly

# Run CLI in development
./bin/dev.js [command]

# Run CLI in production
./bin/run.js [command]
```

## Architecture

**CLI Framework**: oclif-based CLI where commands are auto-discovered from `./dist/commands`. The binary name is `cockpit` and topics are separated by spaces.

**Entry Points**:

- `bin/dev.js` - Development entry (uses ts-node ESM loader)
- `bin/run.js` - Production entry (uses compiled code)

**Source Structure**:

- `src/index.ts` - Main export (re-exports oclif run)
- `src/commands/` - CLI command definitions (auto-discovered by oclif)
- `dist/` - Compiled output (ESM + type definitions)
- `configs/` - Tool configurations (prettier, knip, oxlint)

## Code Standards

- ESM-only (type: "module")
- Strict TypeScript (ES2020 target)
- Double quotes, semicolons, 2-space indentation, 80-char line width
- Three linters enforced: knip (unused imports), sherif (package.json), oxlint (TS/JS)

## Versioning

Uses Changesets for semantic versioning:

```bash
pnpm run changeset   # Create a changeset
pnpm run version     # Apply version bumps
pnpm run release     # Publish to npm
```

Releases are automated via GitHub Actions on tags matching `v*.*.*`.
