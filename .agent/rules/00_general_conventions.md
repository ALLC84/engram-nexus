---
trigger: always_on
---

# Engram Nexus — GENERAL CONVENTIONS

## 1. Build & Verify Commands

- `npm run build:webview` — Build the React webview (production).
- `npm run dev:webview` — Start Vite dev server for webview UI.
- `npm run compile` — Compile the extension TypeScript.
- `tsc --noEmit` — **Type-check only. Run after every implementation step before confirming.**
- `npm run package` — Package extension as `.vsix`.

> **Rule:** Never declare a task done without a clean `tsc --noEmit` pass.

## 2. Inviolable Rules (Senior AI Protocol)

- **No logic in components.** Components render — hooks and the backend decide.
- **No `any`.** Strict TypeScript everywhere. Use `unknown` and narrow, or define the type.
- **No inline SQL.** All queries live in `src/backend/repository/queries.ts`.
- **No frontend data filtering.** Filters are resolved in SQL/backend, never in React.
- **No over-engineering.** Minimum code for the current task. No speculative abstractions.
- **Proactivity:** Correct architectural violations in files you touch. Don't leave broken windows.

## 3. Agent Coordination

- **Single agent per session.** No concurrent branches unless explicitly requested.
- **User approval gates:** No commit without user approval. No destructive ops without confirmation.
- **Session close:** Run `mem_session_summary` before ending. Save decisions with `mem_save`.

## 4. Code Style

- Language: TypeScript strict mode everywhere.
- Styling: Tailwind CSS (webview). No inline styles.
- Icons: Lucide React exclusively.
- Formatting: Prettier (run via `npm run format`).
- Linting: ESLint (run via `npm run lint`).
