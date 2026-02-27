import { getDatabase } from '../../database/sqliteClient';
import {
  OBSERVATION_TYPES,
  NODE_GROUPS,
  NODE_IDS,
  SPECIAL_SESSION_IDS,
  DEFAULT_PROJECT,
} from '../../constants/types';
import {
  FilterOptions,
  QUERY_ALL_PROJECTS,
  buildGraphDataQuery,
  buildFtsSearchQuery,
  buildFallbackSearchQuery,
  buildTrailQuery,
  getFilteringClauses,
} from './queries';

// Re-export FilterOptions so existing consumers keep working without changes.
export type { FilterOptions };

export interface Observation {
  id: number;
  title: string;
  content: string;
  type: string;
  topic_key?: string;
  project?: string;
  session_id?: string;
  author?: string;
  created_at: string;
}

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  group: string;
  color?: string;
  details: Observation;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  /** Distinct project names present in this graph payload (respects active
   *  filters). Used for collapse/expand controls. */
  projects: string[];
  /** All project names in the database, regardless of active filters.
   *  Always complete — used to populate the Focus Mode dropdown. */
  allProjects: string[];
}

/**
 * Executes a parameterized SQL query against the engram SQLite database and
 * returns the matching rows cast to {@link Observation}.
 *
 * The database connection is opened and closed within each call.
 *
 * @param query - The parameterized SQL query string with `?` placeholders.
 * @param params - Positional values that replace the `?` placeholders in order.
 * @returns A promise resolving to an array of {@link Observation} rows.
 */
async function fetchObservations(query: string, params: unknown[]): Promise<Observation[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      db.close();
      if (err) return reject(err);
      resolve(rows as Observation[]);
    });
  });
}

/**
 * Queries the database for all distinct, non-deleted project names.
 *
 * Used during graph construction to ensure every project has a visible cluster
 * node even when all of its observations are filtered out by the active query.
 *
 * @returns A promise resolving to an array of project name strings.
 */
export async function fetchAllProjects(): Promise<string[]> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    db.all(QUERY_ALL_PROJECTS, [], (err, rows) => {
      db.close();
      if (err) return reject(err);
      resolve((rows as { project: string }[]).map((r) => r.project));
    });
  });
}

/**
 * Constructs the graph data structure (nodes and links) from a flat list of observations.
 *
 * This function performs three passes:
 * 1. Creates project nodes (clusters).
 * 2. Creates observation nodes and links them to their project.
 * 3. Creates semantic links between observations based on:
 *    - Session ID (same session, same project).
 *    - Topic Key (same topic or sub-topic).
 *    - Admin Types (special system nodes).
 *
 * @param observations - The list of observations to graph.
 * @param allProjects - The list of all available project names (ensures clusters exist even if empty).
 * @param rootLabel - The label for the central root node (default: 'SOMA').
 * @returns The complete graph data object with nodes and links.
 */
function buildGraphFromObservations(
  observations: Observation[],
  allProjects: string[],
  allProjectsInDb: string[],
  rootLabel = 'SOMA'
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const projectNodes = new Set<string>();

  nodes.push({
    id: NODE_IDS.ROOT_SOMA,
    name: rootLabel,
    val: 4,
    group: NODE_GROUPS.SOMA_ROOT,
    color: '#ffffff',
    details: {
      id: -1,
      title: 'SOMA Core',
      content: 'Central knowledge repository root.',
      type: OBSERVATION_TYPES.SYSTEM,
      created_at: new Date().toISOString(),
    } as Observation,
  });

  allProjects.forEach((projName) => {
    const projectId = `project-${projName}`;
    projectNodes.add(projName);
    nodes.push({
      id: projectId,
      name: projName.toUpperCase(),
      val: 3,
      group: NODE_GROUPS.PROJECT,
      color: '#7aa2f7',
      details: {
        id: -2,
        title: `Project: ${projName}`,
        content: `Root node for project ${projName}`,
        type: OBSERVATION_TYPES.PROJECT,
        project: projName,
        created_at: new Date().toISOString(),
      } as Observation,
    });

    links.push({
      source: NODE_IDS.ROOT_SOMA,
      target: projectId,
      value: 1,
    });
  });

  observations.forEach((obs) => {
    const projName = obs.project || DEFAULT_PROJECT;
    const projectId = `project-${projName}`;

    if (!projectNodes.has(projName)) {
      projectNodes.add(projName);
      nodes.push({
        id: projectId,
        name: projName.toUpperCase(),
        val: 3,
        group: NODE_GROUPS.PROJECT,
        details: {
          id: -2,
          title: `Project: ${projName}`,
          content: `Root node for project ${projName}`,
          type: OBSERVATION_TYPES.PROJECT,
          project: projName,
          created_at: new Date().toISOString(),
        } as Observation,
      });

      links.push({
        source: NODE_IDS.ROOT_SOMA,
        target: projectId,
        value: 1,
      });
    }

    const topicBase = obs.topic_key ? obs.topic_key.split('/')[0].trim() : projName;

    nodes.push({
      id: String(obs.id),
      name: obs.title || `Observation ${obs.id}`,
      val: 1,
      group: topicBase,
      details: { ...obs, project: obs.project || DEFAULT_PROJECT },
    });

    links.push({
      source: projectId,
      target: String(obs.id),
      value: 0.5,
    });
  });

  // Third pass: Chain observations by session, topic, and type (O(N) — no cliques)
  const sessionGroups = new Map<string, Observation[]>();
  const topicGroups = new Map<string, Observation[]>();
  const typeGroups = new Map<string, Observation[]>();

  for (const obs of observations) {
    // Session grouping — skip MANUAL_SAVE
    if (obs.session_id && obs.session_id !== SPECIAL_SESSION_IDS.MANUAL_SAVE) {
      const group = sessionGroups.get(obs.session_id) ?? [];
      group.push(obs);
      sessionGroups.set(obs.session_id, group);
    }

    // Topic grouping — scoped per project to avoid cross-project edges
    if (obs.topic_key) {
      const topicRoot = obs.topic_key.split('/')[0].trim();
      if (topicRoot) {
        const key = `${topicRoot}:${obs.project ?? DEFAULT_PROJECT}`;
        const group = topicGroups.get(key) ?? [];
        group.push(obs);
        topicGroups.set(key, group);
      }
    }

    // Type grouping — scoped per project, rescues orphan nodes
    const typeKey = `${obs.type}:${obs.project ?? DEFAULT_PROJECT}`;
    const typeGroup = typeGroups.get(typeKey) ?? [];
    typeGroup.push(obs);
    typeGroups.set(typeKey, typeGroup);
  }

  // Chain: same session → value 2 (strong temporal signal)
  for (const group of sessionGroups.values()) {
    for (let i = 0; i < group.length - 1; i++) {
      links.push({ source: String(group[i].id), target: String(group[i + 1].id), value: 2 });
    }
  }

  // Chain: same topic root within same project → value 1 (semantic signal)
  for (const group of topicGroups.values()) {
    for (let i = 0; i < group.length - 1; i++) {
      links.push({ source: String(group[i].id), target: String(group[i + 1].id), value: 1 });
    }
  }

  // Chain: same type within same project → value 0.5 (weak structural signal, rescues orphans)
  for (const group of typeGroups.values()) {
    for (let i = 0; i < group.length - 1; i++) {
      links.push({ source: String(group[i].id), target: String(group[i + 1].id), value: 0.5 });
    }
  }

  return { nodes, links, projects: Array.from(projectNodes), allProjects: allProjectsInDb };
}

/**
 * Retrieves the graph data based on the provided filters.
 *
 * Fetches observations matching the filters and constructs the graph.
 *
 * @param filters - Options to filter the graph data (date, type, projects).
 * @param rootLabel - Label for the root node.
 * @returns A promise resolving to the graph data (nodes and links).
 */
export async function getGraphData(
  filters: FilterOptions = {},
  rootLabel = 'SOMA'
): Promise<GraphData> {
  const { clause, params } = getFilteringClauses(filters);

  const [observations, allProjectsRaw] = await Promise.all([
    fetchObservations(buildGraphDataQuery(clause), [...params, filters.limit || 100]),
    fetchAllProjects(),
  ]);

  const allProjects = filters.focusProject
    ? allProjectsRaw.filter((p) => p === filters.focusProject)
    : allProjectsRaw;

  return buildGraphFromObservations(observations, allProjects, allProjectsRaw, rootLabel);
}

/**
 * Searches the graph data using FTS5 full-text search.
 *
 * If a search term is provided, it uses the `observations_fts` virtual table.
 * Falls back to `LIKE` query if FTS5 fails.
 *
 * @param searchTerm - The text to search for.
 * @param filters - Additional filters to apply.
 * @param rootLabel - Label for the root node.
 * @returns A promise resolving to the graph data containing matching nodes.
 */
export async function searchGraphData(
  searchTerm: string,
  filters: FilterOptions = {},
  rootLabel = 'SOMA'
): Promise<GraphData> {
  if (!searchTerm) return getGraphData(filters, rootLabel);

  const { clause, params: filterParams } = getFilteringClauses(filters);

  const formattedSearch = searchTerm.includes('"')
    ? searchTerm
    : `"${searchTerm.replace(/"/g, '""')}"`;

  const [allProjectsRaw, observations] = await Promise.all([
    fetchAllProjects(),
    (async () => {
      try {
        return await fetchObservations(buildFtsSearchQuery(clause), [
          formattedSearch,
          ...filterParams,
          filters.limit || 100,
        ]);
      } catch (error) {
        console.error('FTS5 failed, falling back to LIKE:', error);
        const likeTerm = `%${searchTerm}%`;
        return await fetchObservations(buildFallbackSearchQuery(clause), [
          likeTerm,
          likeTerm,
          ...filterParams,
          filters.limit || 100,
        ]);
      }
    })(),
  ]);

  const allProjects = filters.focusProject
    ? allProjectsRaw.filter((p) => p === filters.focusProject)
    : allProjectsRaw;

  return buildGraphFromObservations(observations, allProjects, allProjectsRaw, rootLabel);
}

/**
 * Retrieves all observations belonging to a specific Knowledge Trail.
 *
 * A trail is defined by a shared `topic_key`, a shared `session_id`, or both.
 * Results are ordered chronologically (oldest first) so the caller can render
 * them as a timeline without performing any sorting in the frontend.
 *
 * @param topicKey  - If provided, includes all observations with this topic key.
 * @param sessionId - If provided, includes all observations with this session ID
 *                    (excluding the special `manual-save` sentinel value).
 * @returns A promise resolving to the sorted list of matching observations.
 */
export async function getTrailData(
  topicKey?: string,
  sessionId?: string
): Promise<Observation[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (topicKey) {
    conditions.push('topic_key = ?');
    params.push(topicKey);
  }

  if (sessionId && sessionId !== SPECIAL_SESSION_IDS.MANUAL_SAVE) {
    conditions.push(`(session_id = ? AND session_id != '${SPECIAL_SESSION_IDS.MANUAL_SAVE}')`);
    params.push(sessionId);
  }

  if (conditions.length === 0) return [];

  return fetchObservations(buildTrailQuery(conditions.join(' OR ')), params);
}
