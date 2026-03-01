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
  /** Administrative node type for the root SOMA hub */
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
