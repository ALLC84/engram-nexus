# Engram Nexus: SOMA

> A VS Code extension that visualizes your [Engram](https://github.com/Gentleman-Programming/engram) memory as an interactive, force-directed knowledge graph.

Engram Nexus connects directly to your local `~/.engram/engram.db` and renders your technical decisions, patterns, bug fixes, features, and architectural choices as a living, explorable graph — your developer brain, made visible.

---

## Features

### Interactive Knowledge Graph
Observations appear as color-coded nodes connected by semantic and temporal links. Projects cluster into collapsible super-nodes to prevent cognitive overload on large databases. The physics engine organizes your memories into a dense, organic sphere.

### Semantic Coloring by Type
Each observation type has a distinct color, fully customizable from VS Code Settings:

| Type | Default Color |
|---|---|
| `decision` | Amber `#f59e0b` |
| `architecture` | Blue `#3b82f6` |
| `bugfix` | Red `#ef4444` |
| `pattern` | Purple `#a855f7` |
| `learning` | Green `#22c55e` |
| `feature` | Cyan `#06b6d4` |
| `config` | Orange `#f97316` |
| `discovery` | Emerald `#10b981` |
| `session_summary` | Slate `#94a3b8` |
| `manual` | Slate `#64748b` |

### Advanced Filtering
Stack multiple filters simultaneously — all filtering happens in SQL/backend, never in the frontend:

- **Full-Text Search** — Powered by SQLite FTS5 for instant search across all memory content, with LIKE fallback.
- **Observation Type Filter** — Isolate Decisions, Architecture, Bugfixes, Patterns, Learnings, or Sessions with one click. Color-coded buttons on any side of the panel (or hidden via settings).
- **Date Range (Calendar)** — Filter observations by a start/end date range. The calendar adapts to panel width: inline on narrow panels, floating overlay on wider ones.
- **Focus Mode** — Isolate a single project in the graph via the crosshair dropdown, hiding all other projects. Resetting focus restores the full view.
- **Collapse/Expand** — Double-click a project node (or use the global toggle button) to collapse or expand entire projects at once.

### List View Mode
Switch between the force-directed graph and a flat, chronological list of your observations with a single button in the toolbar. The list renders the same data as the graph — all active filters (search, date, type, Focus Mode) apply identically to both views. Each entry shows a **project pill** that activates Focus Mode for that project on click. Your preferred default view (`graph` or `list`) can be saved via `nexus.defaultViewMode`.

### Sentinel Live Feed (Optional, MCP Sentinel Required)
Engram Nexus can overlay a real-time security telemetry feed on top of the graph canvas using SSE from **MCP Sentinel**.

- **Connection source**: `http://127.0.0.1:7438/events` (with `http://localhost:7438/events` fallback).
- **Live status**: `LIVE` (connected) / `RECONNECTING` (backend unavailable or restarting).
- **Security event rendering**:
  - `INVOCATION` → green terminal-style event row.
  - `BLOCK` → red event row + explicit `reason`.
- **Performance-safe buffering**: circular buffer of the last 10 events.
- **Toggle behavior**: show/hide Sentinel panel from the bottom toolbar (eye icon).
- **Panel placement**: configurable independently from filter panel (`nexus.sentinelPanelSide`), default is disabled (`none`).

### Knowledge Trail (Time Machine)
Select any node and click **Show Trail** to transform the graph into a top-down chronological tree. Trails group related observations by `topic_key` (same theme across sessions) or `session_id` (same work session). Use **Copy Entire Trail** to generate a markdown-formatted report of the entire decision thread.

### Deep VS Code Integration
- **Node Details Panel** — Click any node to see full metadata: title, type, project, author origin, creation date, and full content.
- **Inject Context** — One click copies the full observation content to clipboard in a format ready to paste into an AI agent or chat.
- **Read-Only** — The extension never writes to your database. Zero risk of data corruption.

### Adaptive Floating Calendar
The calendar dynamically switches between inline and floating overlay mode based on panel width (configurable threshold, default 380 px). You can move the overlay corner (left/right) with a single button click without touching settings.

### Light & Dark Theme Support
Follows VS Code's active theme automatically, with a manual override toggle button in the toolbar. Styled with custom CSS variables (`--nexus-bg`, `--nexus-text`, `--nexus-accent`, `--nexus-border`) for smooth integration with VS Code's color palette.

---

## Configuration

Open VS Code Settings (`Cmd+,` → Extensions → Engram Nexus) to customize the extension:

### Layout & Behavior

| Setting | Default | Description |
|---|---|---|
| `nexus.rootNodeLabel` | `"SOMA"` | Label for the central root node. 1–30 characters. |
| `nexus.maxNodes` | `100` | Max observations loaded in the graph (10–500). Higher values may impact performance. |
| `nexus.defaultGraphState` | `"expanded"` | Whether projects start collapsed or expanded on load. |
| `nexus.defaultViewMode` | `"graph"` | Default view when the extension opens. Options: `graph`, `list`. |
| `nexus.filterPanelSide` | `"top"` | Where the semantic type filter panel appears. Options: `left`, `right`, `top`, `bottom`, `none`. |
| `nexus.sentinelPanelSide` | `"none"` | Where the Sentinel telemetry panel appears. Options: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `none`. |
| `nexus.calendarDefaultCorner` | `"right"` | Default corner for the floating calendar. Options: `left`, `right`. |
| `nexus.floatCalendarThreshold` | `380` | Panel width (px) at which the calendar switches to floating overlay mode. |

### Node Colors

Customize the color of each observation type using hex color values:

```
nexus.colors.decision         #f59e0b
nexus.colors.architecture     #3b82f6
nexus.colors.bugfix           #ef4444
nexus.colors.pattern          #a855f7
nexus.colors.learning         #22c55e
nexus.colors.feature          #06b6d4
nexus.colors.config           #f97316
nexus.colors.discovery        #10b981
nexus.colors.session_summary  #94a3b8
nexus.colors.manual           #64748b
```

Color changes apply live without reloading the extension.

---

## Requirements

- **VS Code** `^1.80.0`
- **Engram** — This extension reads the SQLite database created by the [Engram memory system](https://github.com/Gentleman-Programming/engram) at `~/.engram/engram.db`. Engram must be installed and have at least one saved observation for the graph to render.
- **MCP Sentinel** (optional, required only for Sentinel Live Feed) — install and run `mcp-sentinel` locally so the SSE endpoint is available on port `7438` (`/events`). If not installed, keep `nexus.sentinelPanelSide` as `none`.

---

## Architecture

The extension follows a strict separation of concerns:

```
src/
  backend/
    ipc/messageHandler.ts     — Central IPC router (FETCH_DATA, SEARCH, GET_TRAIL, INJECT_CONTEXT)
    repository/
      engramRepository.ts     — Data access layer (read-only SQLite queries, graph mapping)
      queries.ts              — SQL query builder (Query Object pattern, no inline SQL elsewhere)

webview-ui/src/
  components/
    Graph/NetworkGraph.tsx    — Force-directed graph (react-force-graph-2d)
    List/ListView.tsx         — Chronological flat list (alternative to graph)
    Sidebar/NodeDetails.tsx   — Node metadata + Inject Context + Show Trail
    Sidebar/FilterPanel.tsx   — Observation type filter buttons
    Timeline/TimelineView.tsx — Chronological trail view + Copy Entire Trail
    Calendar.tsx              — Date range picker
    SearchBar.tsx             — FTS5 search input
    ui/                       — Reusable primitives (IconButton, CTAButton, MetadataRow, ...)
  hooks/
    useGraphData.ts           — IPC data flow, search/trail triggers
    useGraphSettings.ts       — Settings, theme, layout state
    useSentinelTelemetry.ts   — SSE subscription + reconnect + 10-event circular buffer
    overlayPolicy.ts          — Overlay lane rules (filter/sentinel/detail/toolbar docking)
    useSmartCamera.ts         — Force graph camera control (auto-zoom, physics tuning)
    useClickTracker.ts        — Single vs double-click disambiguation (250 ms debounce)
```

**Key design principles:**
- **Zero Frontend Data Filtering** — React renders only. All filters, search, date ranges, and project focus are resolved in SQL.
- **O(N) graph links** — Anti-hairball: nodes sharing a session or topic are connected as a chain, not a clique, preventing exponential edge growth.
- **Read-only database access** — No writes, no transactions, no risk.

---

## Release Notes

### 1.4.0
- **Sentinel Live Feed (optional)** — SSE telemetry overlay from MCP Sentinel with connection status and terminal-style feed.
- **Security event semantics** — `INVOCATION` in green, `BLOCK` in red, with `reason` shown for blocked events.
- **Sentinel panel toggle** — Eye button in the bottom toolbar to collapse/expand the telemetry panel.
- **Sentinel panel positioning** — New `nexus.sentinelPanelSide` setting: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `none`.
- **Overlay lane policy refactor** — Centralized token/policy layout logic to prevent collisions between filter panel, sentinel panel, detail panel, calendar, and center-graph action.

### 1.3.0
- **List View Mode** — New chronological list as an alternative to the graph, toggled with a toolbar button. All active filters apply to both views identically.
- **Project Pill** — Each observation in list and trail views shows a clickable project badge that activates Focus Mode for that project.
- **`nexus.defaultViewMode` setting** — Persist the preferred view (`graph` or `list`) across sessions.
- **Smart filter panel relocation** — When switching to list mode, the filter panel automatically moves to `top` and restores the user's original position on switching back.

### 1.2.0
- **Focus Mode** — Isolate a single project in the graph via a custom dropdown.
- **Global Collapse/Expand** — Single button to collapse or expand all projects simultaneously.
- **Customizable Node Colors** — 10 new `nexus.colors.*` settings for full color control per observation type.
- **Anti-hairball graph topology** — Replaced O(N²) clique linking with O(N) chain links, eliminating visual hairballs on large databases.
- **UI Component Library** — Extracted reusable primitives (`IconButton`, `CTAButton`, `MetadataRow`, `PanelHeader`, `FloatingLabelBox`, `TimelineItem`) to unify interaction patterns across the app.
- **Filter Panel positioning** — `nexus.filterPanelSide` now supports `top`, `bottom`, `left`, `right`, and `none`.
- **Query Object pattern** — All SQL extracted from the repository into a dedicated `queries.ts` module.
- **Adaptive tooltip system** — All icon buttons have 8-position tooltips that never get clipped by panel edges.
- **Light theme support** — Calendar and filter bar adapt correctly to VS Code's light theme.

### 1.1.0
- Knowledge Trail (Time Machine): chronological tree view of related observations.
- Adaptive Floating Calendar with configurable threshold and corner toggle.
- Multiplayer Awareness: visual distinction between local and imported (git-synced) observations.
- "Inject Context" button for instant AI agent integration.

### 1.0.0
- Interactive force-directed knowledge graph.
- Full-text search via SQLite FTS5.
- Semantic type filters.
- Node details panel.
- Light/dark theme toggle.

### 0.0.1
- Initial release.
