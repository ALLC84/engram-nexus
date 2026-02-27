/**
 * Immutable observation type constants for the Engram knowledge graph.
 * Use these instead of raw string literals to prevent typos and enable
 * IDE autocompletion across the backend.
 */
export const OBSERVATION_TYPES = {
  DECISION: 'decision',
  ARCHITECTURE: 'architecture',
  BUGFIX: 'bugfix',
  PATTERN: 'pattern',
  LEARNING: 'learning',
  SESSION_SUMMARY: 'session_summary',
  /** Administrative node type for the root SOMA hub */
  SYSTEM: 'system',
  /** Administrative node type for project cluster nodes */
  PROJECT: 'project',
  /** Used in admin clustering logic alongside session_summary */
  SESSION: 'session',
} as const;

export type ObservationType = (typeof OBSERVATION_TYPES)[keyof typeof OBSERVATION_TYPES];

/**
 * Graph-level state: whether project clusters are expanded or collapsed.
 */
export const GRAPH_STATES = {
  COLLAPSED: 'collapsed',
  EXPANDED: 'expanded',
} as const;

export type GraphState = (typeof GRAPH_STATES)[keyof typeof GRAPH_STATES];

/**
 * Special session_id values that carry semantic meaning in the graph.
 * `MANUAL_SAVE` observations are not part of any session trail.
 */
export const SPECIAL_SESSION_IDS = {
  MANUAL_SAVE: 'manual-save',
} as const;

/**
 * Administrative observation types that get clustered together.
 * Used in queries.ts to build intra-session graph links.
 */
export const ADMIN_NODE_TYPES = [
  OBSERVATION_TYPES.SESSION_SUMMARY,
  OBSERVATION_TYPES.SESSION,
] as const;

/** Group identifier for the root SOMA node in the graph. */
export const NODE_GROUPS = {
  SOMA_ROOT: 'soma-root',
  PROJECT: 'project',
} as const;

/** Fixed node IDs for structural graph nodes. */
export const NODE_IDS = {
  ROOT_SOMA: 'root-soma',
} as const;

/** Fallback project name for observations with no project set. */
export const DEFAULT_PROJECT = 'Global';
