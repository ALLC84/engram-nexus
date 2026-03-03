/**
 * IPC channel identifiers for VS Code Webview ↔ Extension communication.
 * Both sides MUST use the same string values — any mismatch silently drops messages.
 */
export const IPC_CHANNELS = {
  // ── Commands sent FROM webview TO extension ─────────────────────────────
  /** Request initial or filtered graph data. */
  FETCH_DATA: 'fetchData',
  /** Search graph data with a term and optional filters. */
  SEARCH: 'search',
  /** Retrieve the current VS Code extension settings. */
  GET_SETTINGS: 'getSettings',
  /** Copy a formatted observation to the system clipboard. */
  INJECT_CONTEXT: 'injectContext',
  /** Request the chronological list of observations for a Knowledge Trail. */
  GET_TRAIL: 'getTrail',

  // ── Responses sent FROM extension TO webview ─────────────────────────────
  /** Graph data payload ready for rendering. */
  DATA_LOADED: 'dataLoaded',
  /** Error during a graph fetch or search operation. */
  ERROR: 'error',
  /** Settings payload from getNexusConfig(). */
  SETTINGS_LOADED: 'settingsLoaded',
  /** Signal from extension that data-affecting config (maxNodes, label) changed. */
  REFRESH_DATA: 'refreshData',
  /** Knowledge Trail payload: sorted Observation[] for a topic_key / session_id. */
  TRAIL_LOADED: 'trailLoaded',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/**
 * VS Code configuration namespace. Must match `contributes.configuration.id`
 * in package.json.
 */
export const CONFIG_NAMESPACE = 'nexus';

/**
 * Keys within the `nexus.*` VS Code configuration scope.
 */
export const CONFIG_KEYS = {
  ROOT_NODE_LABEL: 'rootNodeLabel',
  MAX_NODES: 'maxNodes',
  CALENDAR_DEFAULT_CORNER: 'calendarDefaultCorner',
  FLOAT_CALENDAR_THRESHOLD: 'floatCalendarThreshold',
  FILTER_PANEL_SIDE: 'filterPanelSide',
  SENTINEL_PANEL_SIDE: 'sentinelPanelSide',
  DEFAULT_GRAPH_STATE: 'defaultGraphState',
  DEFAULT_VIEW_MODE: 'defaultViewMode',
  COLORS: 'colors',
} as const;
