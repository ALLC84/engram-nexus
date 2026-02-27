# AGENT.md — Extension Backend (`src/`)

## Responsibility

Node.js extension host. Owns: SQLite access, IPC routing, VS Code API integration, and graph data mapping. The frontend receives only what this module prepares.

## File Structure

```
src/
  extension.ts                    — Extension entry point, command registration
  constants/
    ipc.ts                        — IPC channel names (IPC_CHANNELS) + config keys (CONFIG_KEYS)
  providers/
    GraphViewProvider.ts          — Webview panel lifecycle (create, reveal, asset URIs)
  backend/
    ipc/
      messageHandler.ts           — Central IPC router: receives all webview commands, delegates to repository
    repository/
      engramRepository.ts         — Data access layer: queries DB, maps rows to GraphNode/GraphLink/Observation
      queries.ts                  — ALL SQL query builders (Query Object pattern — no inline SQL anywhere else)
```

## IPC Channels

Defined in `src/constants/ipc.ts` as `IPC_CHANNELS`. Always use the constant, never the raw string.

| Direction | Constant | Value | Purpose |
|---|---|---|---|
| webview → ext | `FETCH_DATA` | `fetchData` | Load/reload graph with current filters |
| webview → ext | `SEARCH` | `search` | FTS5 search + filters |
| webview → ext | `GET_SETTINGS` | `getSettings` | Request VS Code config |
| webview → ext | `INJECT_CONTEXT` | `injectContext` | Copy observation to clipboard |
| webview → ext | `GET_TRAIL` | `getTrail` | Fetch Knowledge Trail observations |
| ext → webview | `DATA_LOADED` | `dataLoaded` | Graph data payload |
| ext → webview | `TRAIL_LOADED` | `trailLoaded` | Trail observations payload |
| ext → webview | `SETTINGS_LOADED` | `settingsLoaded` | Config payload |
| ext → webview | `REFRESH_DATA` | `refreshData` | Config changed, reload |
| ext → webview | `ERROR` | `error` | Operation failure |

## Database

- **Path:** `~/.engram/engram.db` (resolve with `os.homedir()`)
- **Library:** `sqlite3` npm package
- **Mode:** always `{ readonly: true }`
- **Query pattern:** All SQL in `queries.ts`. Repository calls builders, maps results.

## VS Code Config Namespace

`nexus.*` — Keys defined in `CONFIG_KEYS` (`src/constants/ipc.ts`). Read via `vscode.workspace.getConfiguration('nexus')`.

## Constraints

- No UI logic. No styling. No layout decisions.
- All DB operations non-mutating.
- `messageHandler.ts` routes messages, never executes business logic directly.
