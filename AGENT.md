# AGENT.md — Engram Nexus

## MANDATORY: Before Any Implementation

**At the start of every session, before writing a single line of code:**

1. Read `.agent/workflows/01-start-task.md` — it classifies the task and determines the correct protocol.
2. If the task is non-trivial (new feature, multi-file change, design decision) → activate SDD Orchestrator mode by reading `.agent/workflows/sdd-init.md`.
3. If the task is minor (style fix, typo, single-file patch) → execute directly per `.agent/rules/`.

**This is not optional.** Skipping this step means skipping the architectural gate that prevents unreviewed multi-file changes.

---

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

**Entry point for every task:** `.agent/workflows/01-start-task.md` — read it, classify, then proceed.

- Conventions: `.agent/rules/`
- SDD Orchestrator protocol: `.agent/workflows/sdd-init.md`
- Module context: `src/AGENT.md` (backend) · `webview-ui/AGENT.md` (frontend)
