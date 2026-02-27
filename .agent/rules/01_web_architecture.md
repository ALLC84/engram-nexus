---
trigger: always_on
---

# Engram Nexus — WEBVIEW ARCHITECTURE

## 1. Stack

- **Framework:** React + Vite (webview), TypeScript strict.
- **Styling:** Tailwind CSS + custom CSS variables (`--nexus-bg`, `--nexus-text`, `--nexus-accent`, `--nexus-border`).
- **Graph:** `react-force-graph-2d`.
- **Icons:** Lucide React.
- **Build output:** `webview-ui/build/` (stable filenames, no hashing — required for VS Code extension).

## 2. Core Architectural Principle: Zero Frontend Data Filtering

**The React layer is purely a renderer. It never filters, transforms, or sorts data.**

- All filters (type, date range, project focus, search) are resolved in SQL (`src/backend/repository/queries.ts`).
- State changes in the UI (selecting a filter, changing date) trigger a new IPC request to the backend.
- The webview receives ready-to-render data. No `Array.filter()`, no `Array.sort()` on graph data.

## 3. IPC Communication

- The webview uses the `vscode` singleton from `webview-ui/src/vscode.ts` (wraps `acquireVsCodeApi()`).
- All channel names are defined in `src/constants/ipc.ts` as `IPC_CHANNELS`. Never use raw strings.
- Communication is one-way async: webview sends a command, backend responds with a data event.

**Channels (webview → extension):**
| Channel | Constant | Purpose |
|---|---|---|
| `fetchData` | `IPC_CHANNELS.FETCH_DATA` | Load/reload graph with current filters |
| `search` | `IPC_CHANNELS.SEARCH` | Full-text search + filters |
| `getSettings` | `IPC_CHANNELS.GET_SETTINGS` | Request VS Code config |
| `injectContext` | `IPC_CHANNELS.INJECT_CONTEXT` | Copy observation to clipboard |
| `getTrail` | `IPC_CHANNELS.GET_TRAIL` | Fetch Knowledge Trail observations |

**Channels (extension → webview):**
| Channel | Constant | Purpose |
|---|---|---|
| `dataLoaded` | `IPC_CHANNELS.DATA_LOADED` | Graph data ready for render |
| `trailLoaded` | `IPC_CHANNELS.TRAIL_LOADED` | Trail observations ready |
| `settingsLoaded` | `IPC_CHANNELS.SETTINGS_LOADED` | Config payload |
| `refreshData` | `IPC_CHANNELS.REFRESH_DATA` | Config changed, reload data |
| `error` | `IPC_CHANNELS.ERROR` | Operation failure |

## 4. Hook Architecture

Data and logic live in hooks — never in components.

| Hook | Responsibility |
|---|---|
| `useGraphData.ts` | IPC data flow: fetch, search, trail. Exports `triggerSearch`, `fetchTrail`, `clearTrail`. |
| `useGraphSettings.ts` | VS Code settings, theme state, layout config. Exports `toggleTheme`, `toggleCorner`. |
| `useSmartCamera.ts` | ForceGraph2D physics tuning and auto-zoom. |
| `useClickTracker.ts` | Single vs double-click disambiguation (250 ms debounce for project nodes only). |

## 5. Component Architecture

- **Functional components with hooks only.** No class components.
- **UI primitives live in `webview-ui/src/components/ui/`.** Before creating a new button/badge/panel header, check if a primitive already exists.

**Available UI primitives:**
- `IconButton` — Icon button with 8-position tooltip system.
- `CTAButton` — Primary/secondary call-to-action button.
- `MetadataRow` — Icon + label + value display row.
- `PanelHeader` — Side panel header with title and close button.
- `FloatingLabelBox` — Container with floating label above.
- `TimelineItem` — Timeline entry with connector, date, type badge, expandable content.

## 6. Theme

- Follows VS Code theme automatically via DOM class (`vscode-light` / `vscode-dark`).
- Manual override via `toggleTheme()` which sets `theme-light` / `theme-dark` on `document.body`.
- **Never hardcode colors.** Use `--nexus-*` variables or Tailwind classes that map to them.
