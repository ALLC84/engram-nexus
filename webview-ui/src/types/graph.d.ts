import type { SentinelPanelSide } from "../constants/types";

// ── Core domain types ────────────────────────────────────────────────────────

/**
 * The raw observation payload stored in the SQLite DB and serialised over IPC.
 * Maps 1:1 to the `details` field on every graph node.
 */
export interface ObservationDetails {
  id: number;
  title: string;
  content: string;
  type: string;
  topic_key?: string;
  project?: string;
  session_id?: string;
  /** Populated from `tool_name` in the DB — identifies the authoring agent. */
  author?: string;
  created_at: string;
}

/** A force-graph node augmented with Engram-specific data. */
export interface EngramNode {
  id?: string | number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;

  // Business fields
  name: string;
  /** Sizing hint for the canvas renderer (soma=4, project=3, observation=1). */
  val: number;
  /** Semantic cluster identifier (topic root or project name). */
  group: string;
  details: ObservationDetails;
  color?: string;
}

/** A force-graph link augmented with Engram-specific data. */
export interface EngramLink {
  source: string | number | EngramNode;
  target: string | number | EngramNode;

  // Business fields
  /**
   * Semantic strength of the connection:
   * - ≥ 1 → structural link (project → observation, root → project)
   * - 0.5 → admin clustering link
   * - < 1 → organic semantic link
   */
  value: number;
}

/** The complete graph payload exchanged over IPC. */
export interface EngramGraphData {
  nodes: EngramNode[];
  links: EngramLink[];
  /** Distinct project names present in this graph payload (respects active
   *  filters). Used for collapse/expand controls. */
  projects: string[];
  /** All project names in the database, regardless of active filters.
   *  Always complete — used to populate the Focus Mode dropdown. */
  allProjects: string[];
}

// ── IPC Payload contracts ────────────────────────────────────────────────────

/**
 * Filters that can narrow down the graph query.
 * Sent as part of FETCH_DATA and SEARCH commands.
 */
export interface FetchGraphPayload {
  startDate?: string;
  endDate?: string;
  activeFilter?: string | null;
  collapsedProjects?: string[];
  /** When set, only the named project's observations appear in the graph. */
  focusProject?: string | null;
}

/** Payload for the SEARCH IPC command. */
export interface SearchPayload {
  searchTerm: string;
  filters: FetchGraphPayload;
}

/**
 * Settings payload received from the extension via SETTINGS_LOADED.
 * Keys match the `nexus.*` VS Code configuration entries.
 */
export interface NexusSettings {
  rootNodeLabel: string;
  maxNodes: number;
  calendarDefaultCorner: string;
  floatCalendarThreshold: number;
  filterPanelSide: string;
  sentinelPanelSide?: SentinelPanelSide;
  defaultGraphState: string;
  defaultViewMode: string;
  nodeColors?: Record<string, string>;
}

/** Payload for the GET_TRAIL IPC command. */
export interface TrailPayload {
  topicKey?: string;
  sessionId?: string;
}

/** Base shape of every message that crosses the Webview ↔ Extension boundary. */
export interface IpcMessage {
  command: string;
  payload?: unknown;
}
