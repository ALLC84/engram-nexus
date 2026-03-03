/**
 * Immutable observation type constants for the Engram knowledge graph.
 * Mirrors src/constants/types.ts (backend). Both sides must stay in sync.
 */
export const OBSERVATION_TYPES = {
  DECISION: "decision",
  ARCHITECTURE: "architecture",
  BUGFIX: "bugfix",
  PATTERN: "pattern",
  LEARNING: "learning",
  SESSION_SUMMARY: "session_summary",
  /** Administrative node type for grouping by observation type */
  TYPE_HUB: "type_hub",
  SYSTEM: "system",
  /** Administrative node type for project cluster nodes */
  PROJECT: "project",
  /** Used in admin clustering logic alongside session_summary */
  SESSION: "session",
} as const;

export type ObservationType = (typeof OBSERVATION_TYPES)[keyof typeof OBSERVATION_TYPES];

/**
 * Graph-level state: whether project clusters are expanded or collapsed.
 */
export const GRAPH_STATES = {
  COLLAPSED: "collapsed",
  EXPANDED: "expanded",
} as const;

export type GraphState = (typeof GRAPH_STATES)[keyof typeof GRAPH_STATES];

export const VIEW_MODES = {
  GRAPH: "graph",
  LIST: "list",
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];

/**
 * Valid positions for the filter panel overlay within the graph canvas.
 */
export const FILTER_PANEL_SIDES = {
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
  BOTTOM: "bottom",
  NONE: "none",
} as const;

export type FilterPanelSide = (typeof FILTER_PANEL_SIDES)[keyof typeof FILTER_PANEL_SIDES];

/**
 * Valid positions for the Sentinel telemetry panel overlay.
 */
export const SENTINEL_PANEL_SIDES = {
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  NONE: "none",
} as const;

export type SentinelPanelSide = (typeof SENTINEL_PANEL_SIDES)[keyof typeof SENTINEL_PANEL_SIDES];

/**
 * Valid corners for the floating calendar overlay.
 */
export const FLOAT_CORNERS = {
  LEFT: "left",
  RIGHT: "right",
} as const;

export type FloatCorner = (typeof FLOAT_CORNERS)[keyof typeof FLOAT_CORNERS];

/**
 * Special session_id values that carry semantic meaning in the graph.
 * `MANUAL_SAVE` observations are excluded from session-based trail matching.
 */
export const SPECIAL_SESSION_IDS = {
  MANUAL_SAVE: "manual-save",
} as const;

/**
 * Node group identifiers for the force graph.
 * Mirrors src/constants/types.ts (backend).
 */
export const NODE_GROUPS = {
  SOMA_ROOT: "soma-root",
  PROJECT: "project",
} as const;

/** Fixed node IDs for structural graph nodes. Mirrors src/constants/types.ts. */
export const NODE_IDS = {
  ROOT_SOMA: "root-soma",
} as const;
