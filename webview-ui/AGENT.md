# AGENT.md — Webview Frontend (`webview-ui/`)

## Responsibility

React application running in VS Code's browser sandbox. Renders graph data received from the extension backend. **Never filters, sorts, or transforms data** — that is the backend's job.

## Stack

- React + Vite, TypeScript strict
- Tailwind CSS v4 (custom `--nexus-*` CSS variables for theming)
- Lucide React (icons — no other icon library)
- `react-force-graph-2d` (graph rendering)
- Build output: `build/` (no filename hashing — required for VS Code asset URIs)

## IPC Communication

Use the `vscode` singleton from `src/vscode.ts` (wraps `acquireVsCodeApi()`):

```ts
import { vscode } from '../vscode';
vscode.postMessage({ command: IPC_CHANNELS.FETCH_DATA, payload: filters });
```

Channel constants live in `src/constants/ipc.ts` (shared with backend). Never use raw string channel names.

## Hook Architecture

Logic lives in hooks. Components receive data and call handlers — they do not own state or fetch data directly.

| Hook | Owns |
|---|---|
| `useGraphData.ts` | IPC data flow, graph state, trail state. Exports `triggerSearch`, `fetchTrail`, `clearTrail`. |
| `useGraphSettings.ts` | VS Code settings, theme, layout config. Exports `toggleTheme`, `toggleCorner`. |
| `useSmartCamera.ts` | ForceGraph2D physics tuning, `zoomToFit()`. |
| `useClickTracker.ts` | Single vs double-click (250 ms debounce for project nodes only). |

## Component Structure

```
src/components/
  Graph/
    NetworkGraph.tsx        — Force-directed graph renderer
  Sidebar/
    NodeDetails.tsx         — Selected node metadata + Inject Context + Show Trail
    FilterPanel.tsx         — Observation type filter buttons (configurable position)
  Timeline/
    TimelineView.tsx        — Chronological trail view + Copy Entire Trail
  Calendar.tsx              — Date range picker (inline / floating overlay)
  SearchBar.tsx             — FTS5 search input
  ui/                       — Reusable primitives (check here before creating new components)
    IconButton.tsx          — Icon button with 8-position tooltip
    CTAButton.tsx           — Primary/secondary action button
    MetadataRow.tsx         — Icon + label + value row
    PanelHeader.tsx         — Panel header with title + close
    FloatingLabelBox.tsx    — Container with floating label
    TimelineItem.tsx        — Timeline entry with connector, badge, expandable content
```

**Rule:** Before creating a new interactive element, check `ui/` first. Extend or compose primitives — do not duplicate.

## Zero Frontend Data Filtering

This is the most important architectural rule for this module:

- **Never** `Array.filter()`, `Array.sort()`, or `Array.map()` graph data to narrow results.
- When a filter changes (type, date, search term, project), send a new `FETCH_DATA` or `SEARCH` message to the backend.
- The backend returns already-filtered data. The component renders it as-is.

## Theming

- VS Code theme detected from DOM class (`vscode-light` / `vscode-dark`).
- Manual override: `toggleTheme()` sets `theme-light` or `theme-dark` on `document.body`.
- Never hardcode colors. Use `--nexus-*` CSS variables or Tailwind classes that resolve to them.

## Constraints

- No Node.js APIs (`fs`, `path`, `os`, `sqlite3`). These will throw at runtime.
- No direct database access of any kind.
- All user-facing configuration is delivered via `SETTINGS_LOADED` IPC message — never read from `localStorage` directly.
