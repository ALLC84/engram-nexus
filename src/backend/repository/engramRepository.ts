import { getDatabase } from '../../database/sqliteClient';
import { SPECIAL_SESSION_IDS } from '../../constants/types';
import {
  FilterOptions,
  QUERY_ALL_PROJECTS,
  buildGraphDataQuery,
  buildFtsSearchQuery,
  buildFallbackSearchQuery,
  buildTrailQuery,
  getFilteringClauses,
} from './queries';
import {
  buildGraphFromObservations,
  type Observation,
  type GraphNode,
  type GraphLink,
  type GraphData,
} from './graphBuilder';

// Re-export FilterOptions and graph types so existing consumers keep working without changes.
export type { FilterOptions, Observation, GraphNode, GraphLink, GraphData };

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
