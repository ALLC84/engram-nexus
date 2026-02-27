/**
 * IPC channel identifiers for VS Code Webview ↔ Extension communication.
 * Mirrors src/constants/ipc.ts (backend). Both sides MUST use identical values.
 */
export const IPC_CHANNELS = {
  // ── Commands sent FROM webview TO extension ─────────────────────────────
  /** Request initial or filtered graph data. */
  FETCH_DATA: "fetchData",
  /** Search graph data with a term and optional filters. */
  SEARCH: "search",
  /** Retrieve the current VS Code extension settings. */
  GET_SETTINGS: "getSettings",
  /** Copy a formatted observation to the system clipboard. */
  INJECT_CONTEXT: "injectContext",
  /** Request the chronological list of observations for a Knowledge Trail. */
  GET_TRAIL: "getTrail",

  // ── Responses sent FROM extension TO webview ─────────────────────────────
  /** Graph data payload ready for rendering. */
  DATA_LOADED: "dataLoaded",
  /** Error during a graph fetch or search operation. */
  ERROR: "error",
  /** Settings payload from the extension configuration. */
  SETTINGS_LOADED: "settingsLoaded",
  /** Signal from extension that data-affecting config (maxNodes, label) changed. */
  REFRESH_DATA: "refreshData",
  /** Knowledge Trail payload: sorted Observation[] for a topic_key / session_id. */
  TRAIL_LOADED: "trailLoaded",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
