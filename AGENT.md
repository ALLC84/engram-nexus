# AGENT.md — Engram Nexus

## Project Goal

VS Code extension that reads `~/.engram/engram.db` (read-only) and renders observations as an interactive, force-directed knowledge graph. The user explores their developer memory visually: decisions, patterns, bug fixes, features, and architectural choices.

## Module Boundaries

| Module | Runtime | Directory | Can access |
|---|---|---|---|
| **Extension Backend** | Node.js (VS Code host) | `src/` | File system, SQLite, VS Code API |
| **Webview Frontend** | Browser sandbox | `webview-ui/` | DOM, `postMessage` only — NO Node.js, NO fs, NO sqlite |

Communication between modules is **exclusively via IPC** (`postMessage` / `onDidReceiveMessage`). Channel names are defined in `src/constants/ipc.ts`. Never use raw strings for IPC.

## Inviolable Rules

1. **Read-only database.** No `INSERT`, `UPDATE`, `DELETE`, `CREATE` ever. Pass `{ readonly: true }` on every connection.
2. **Zero Frontend Data Filtering.** React renders what the backend sends. All filters (text, date, type, project) are resolved in SQL. No `Array.filter()` or `Array.sort()` on graph data in the frontend.
3. **No inline SQL.** All queries live in `src/backend/repository/queries.ts`. The repository calls builders, never builds strings.
4. **IPC via constants.** Always use `IPC_CHANNELS.*` from `src/constants/ipc.ts`. A mismatched string silently drops the message.
5. **No `any`.** TypeScript strict mode everywhere.
6. **`tsc --noEmit` before done.** No implementation is complete without a clean type-check.

## Tech Stack

- **Extension:** TypeScript, Node.js, `sqlite3` (npm), VS Code API
- **Webview:** React + Vite, TypeScript strict, Tailwind CSS v4, Lucide React, `react-force-graph-2d`
- **IPC:** VS Code `postMessage` / `onDidReceiveMessage` with typed channel constants

## Development Workflow

- **Minor fixes / style / single-file changes:** implement directly following `.agent/rules/`.
- **New features / complex bugs / multi-file refactors:** start with `/sdd-init` (SDD Orchestrator mode). See `.agent/workflows/sdd-init.md`.
- For detailed conventions: `.agent/rules/`
- For workflows and protocols: `.agent/workflows/`
- For module-specific context: `src/AGENT.md` (backend) · `webview-ui/AGENT.md` (frontend)
