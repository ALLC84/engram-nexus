/**
 * SQL query catalog for the Engram repository layer.
 *
 * This module owns all raw SQL construction and WHERE-clause assembly.
 * The repository (engramRepository.ts) must not contain inline SQL strings;
 * it delegates every query-building concern to the functions exported here.
 */

export interface FilterOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  activeFilter?: string;
  collapsedProjects?: string[];
  /** When set, only observations belonging to this project are returned. */
  focusProject?: string;
}

// ---------------------------------------------------------------------------
// Static queries
// ---------------------------------------------------------------------------

export const QUERY_ALL_PROJECTS =
  `SELECT DISTINCT project FROM observations WHERE deleted_at IS NULL AND project IS NOT NULL`;

// ---------------------------------------------------------------------------
// Dynamic query builders
// ---------------------------------------------------------------------------

/**
 * Builds the main graph-data SELECT, appending the pre-built WHERE clause.
 * The caller is responsible for appending the LIMIT value as the last param.
 */
export function buildGraphDataQuery(clause: string): string {
  return (
    `SELECT id, title, content, type, tool_name as author, scope, topic_key, project, session_id, created_at` +
    ` FROM observations` +
    ` WHERE deleted_at IS NULL ${clause}` +
    ` ORDER BY created_at ASC LIMIT ?`
  );
}

/**
 * Builds the FTS5 full-text search query.
 *
 * Column references in `clause` are rewritten to use the `o.` table alias
 * because the FTS JOIN exposes `o` for the base table and `fts` for the
 * virtual table.
 *
 * Parameter order expected by the caller: [searchTerm, ...filterParams, limit]
 */
export function buildFtsSearchQuery(clause: string): string {
  const aliasedClause = clause
    .replace(/project/g, 'o.project')
    .replace(/created_at/g, 'o.created_at')
    .replace(/type/g, 'o.type');

  return (
    `SELECT o.id, o.title, o.content, o.type, o.tool_name as author, o.scope, o.topic_key, o.project, o.session_id, o.created_at` +
    ` FROM observations o` +
    ` JOIN observations_fts fts ON o.id = fts.rowid` +
    ` WHERE observations_fts MATCH ? ${aliasedClause}` +
    ` ORDER BY rank` +
    ` LIMIT ?`
  );
}

/**
 * Builds the LIKE-based fallback search query used when FTS5 is unavailable.
 *
 * Parameter order expected by the caller: [likeTerm, likeTerm, ...filterParams, limit]
 */
export function buildFallbackSearchQuery(clause: string): string {
  return (
    `SELECT id, title, content, type, tool_name as author, scope, topic_key, project, session_id, created_at` +
    ` FROM observations` +
    ` WHERE (title LIKE ? OR content LIKE ?) AND deleted_at IS NULL ${clause}` +
    ` ORDER BY created_at ASC` +
    ` LIMIT ?`
  );
}

/**
 * Builds the Knowledge Trail SELECT.
 *
 * @param conditionsClause - Pre-built OR-joined conditions string, e.g.
 *   `"topic_key = ? OR (session_id = ? AND session_id != 'manual-save')"`.
 *   Must not be empty.
 */
export function buildTrailQuery(conditionsClause: string): string {
  return (
    `SELECT id, title, content, type, tool_name as author, scope, topic_key, project, session_id, created_at` +
    ` FROM observations` +
    ` WHERE deleted_at IS NULL AND (${conditionsClause})` +
    ` ORDER BY created_at ASC`
  );
}

// ---------------------------------------------------------------------------
// WHERE-clause assembler
// ---------------------------------------------------------------------------

/**
 * Generates the SQL WHERE fragment and bound parameters for filtering
 * observations by date range, type, collapsed projects, and focus project.
 *
 * The returned `clause` always starts with ` AND` (or is empty) so callers
 * can safely interpolate it after an existing `WHERE` condition.
 */
export function getFilteringClauses(filters: FilterOptions): {
  clause: string;
  params: unknown[];
} {
  let clause = '';
  const params: unknown[] = [];

  if (filters.startDate && filters.endDate) {
    clause += ' AND date(created_at) BETWEEN date(?) AND date(?)';
    params.push(filters.startDate, filters.endDate);
  } else if (filters.startDate) {
    clause += ' AND date(created_at) >= date(?)';
    params.push(filters.startDate);
  } else if (filters.endDate) {
    clause += ' AND date(created_at) <= date(?)';
    params.push(filters.endDate);
  }

  if (filters.activeFilter) {
    clause += ' AND type = ?';
    params.push(filters.activeFilter);
  }

  if (filters.collapsedProjects && filters.collapsedProjects.length > 0) {
    const placeholders = filters.collapsedProjects.map(() => '?').join(',');
    clause += ` AND project NOT IN (${placeholders})`;
    params.push(...filters.collapsedProjects);
  }

  if (filters.focusProject) {
    clause += ' AND project = ?';
    params.push(filters.focusProject);
  }

  return { clause, params };
}
