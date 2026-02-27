# Change Log

All notable changes to the "engram-nexus" extension will be documented in this file.

## [1.1.0] - 2026-02-24

### Added

- **Semantic Filters & Auto-Framing:** Sidebar to quickly filter the graph by Semantic Type (bugfix, architecture, etc.). The camera automatically pans and zooms to frame the surviving nodes.
- **Knowledge Trail (DAG Mode):** Added a "Show Knowledge Trail" button in the node details panel that transforms the organic graph into a top-down chronological tree, isolating the evolution of a session or topic.
- **Dynamic Clustering:** Project nodes now act as collapsible super-nodes. Double-click a project to expand or collapse all its internal observations. Added `nexus.defaultGraphState` setting to control startup behavior.
- **Multiplayer Awareness (Git Sync Integration):** Visually highlights collective knowledge. Nodes imported from other team members via Engram Git sync are rendered with subtle dashed borders and color-accented directional links to differentiate them from local creations.

## [0.0.1] - 2026-02-23

### Added

- Initial release of Engram Nexus: SOMA.
- Organic knowledge graph visualization for Engram observations.
- Semantic clustering by project, session, and topic keys.
- Real-time date filtering with adaptive floating calendar.
- Full text search via SQLite FTS5 for instant discovery.
- Cross-project connections restricted to shared knowledge variants (bugfix/pattern/architecture).
- Direct "Copy for Agent" integration to inject memory context into AI prompts.
- VS Code Settings integration for root node identity (`nexus.rootNodeLabel`) and UI behaviors.
- Native Light and Dark theme support.
