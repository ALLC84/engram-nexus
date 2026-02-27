---
trigger: always_on
---

# Engram Nexus — BACKEND & ENGRAM RULES

## 1. Database Access

- **Path:** `~/.engram/engram.db`
- **Mode:** `READ-ONLY` (mandatory). Pass `{ readonly: true }` flag.
- **Library:** `sqlite3` (npm package). Already installed as a production dependency.
- **Never write** to the database. No `INSERT`, `UPDATE`, `DELETE`, `CREATE`.

## 2. Query Architecture (Query Object Pattern)

- **All SQL lives in `src/backend/repository/queries.ts`.** No inline SQL anywhere else.
- `engramRepository.ts` calls query builders and maps results — it never builds strings with SQL.
- Query builders receive typed parameters and return `{ sql: string, params: any[] }`.
- Use FTS5 (`MATCH`) for full-text search. Wrap unquoted terms in double quotes before passing to `MATCH`. Fall back to `LIKE` if FTS5 returns no results.

**Key query builders:**
- `buildGraphDataQuery(filters)` — Main SELECT with dynamic WHERE clause.
- `buildFtsSearchQuery(term, filters)` — FTS5 MATCH query.
- `buildFallbackSearchQuery(term, filters)` — LIKE-based fallback.
- `buildTrailQuery(topicKey, sessionId)` — Related observations for Knowledge Trail.
- `getFilteringClauses(filters)` — Assembles WHERE conditions from active filters.

## 3. Observation Types

All 10 valid types — used for filtering, coloring, and Engram memory persistence:

`decision` · `architecture` · `bugfix` · `pattern` · `learning` · `feature` · `config` · `discovery` · `session_summary` · `manual`

## 4. Engram Memory Conventions

- **Project:** always `"engram-nexus"` on every `mem_save` call.
- **Topic keys:** use `architecture/`, `bugfix/`, `feature/` prefixes for persistent decisions (e.g. `architecture/ipc-pattern`).
- **Save proactively** after: architecture decisions, new IPC channels, SQL optimizations, UI state patterns, bug fixes.
- **Session close:** always call `mem_session_summary` before ending.

**Valid `type` values for mem_save:** `decision`, `architecture`, `bugfix`, `pattern`, `learning`, `feature`, `config`, `discovery`, `session_summary`, `manual`.

### SDD Artifacts in Engram

When SDD sub-agents persist artifacts, they use this naming:
- `topic_key`: `sdd/{change-name}/{phase}` — e.g. `sdd/add-export-feature/proposal`
- `type`: `feature` (proposal/spec) · `architecture` (design) · `decision` (tasks)
- `project`: `"engram-nexus"` always.

The SDD system uses `artifact_store.mode: engram` — no `openspec/` files are created.

## 5. Backend File Structure

```
src/
  constants/ipc.ts              — IPC channel names + config keys (source of truth)
  providers/GraphViewProvider.ts — Webview panel lifecycle manager
  backend/
    ipc/messageHandler.ts       — Central IPC router (handles all webview commands)
    repository/
      engramRepository.ts       — Data access layer + graph mapping
      queries.ts                — ALL SQL query builders (Query Object pattern)
```
