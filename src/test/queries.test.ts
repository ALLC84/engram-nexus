import { describe, it, expect } from 'vitest';
import {
  getFilteringClauses,
  buildFtsSearchQuery,
  buildTrailQuery,
  buildGraphDataQuery,
} from '../backend/repository/queries';

describe('getFilteringClauses', () => {
  it('returns empty clause and params when no filters', () => {
    const { clause, params } = getFilteringClauses({});
    expect(clause).toBe('');
    expect(params).toEqual([]);
  });

  it('handles startDate only', () => {
    const { clause, params } = getFilteringClauses({ startDate: '2024-01-01' });
    expect(clause).toBe(' AND date(created_at) >= date(?)');
    expect(params).toEqual(['2024-01-01']);
  });

  it('handles endDate only', () => {
    const { clause, params } = getFilteringClauses({ endDate: '2024-12-31' });
    expect(clause).toBe(' AND date(created_at) <= date(?)');
    expect(params).toEqual(['2024-12-31']);
  });

  it('handles startDate and endDate together (BETWEEN)', () => {
    const { clause, params } = getFilteringClauses({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
    expect(clause).toBe(' AND date(created_at) BETWEEN date(?) AND date(?)');
    expect(params).toEqual(['2024-01-01', '2024-12-31']);
  });

  it('handles activeFilter', () => {
    const { clause, params } = getFilteringClauses({ activeFilter: 'bugfix' });
    expect(clause).toBe(' AND type = ?');
    expect(params).toEqual(['bugfix']);
  });

  it('handles collapsedProjects with single project', () => {
    const { clause, params } = getFilteringClauses({ collapsedProjects: ['alpha'] });
    expect(clause).toBe(' AND project NOT IN (?)');
    expect(params).toEqual(['alpha']);
  });

  it('handles collapsedProjects with multiple projects', () => {
    const { clause, params } = getFilteringClauses({ collapsedProjects: ['a', 'b'] });
    expect(clause).toBe(' AND project NOT IN (?,?)');
    expect(params).toEqual(['a', 'b']);
  });

  it('handles focusProject', () => {
    const { clause, params } = getFilteringClauses({ focusProject: 'nexus' });
    expect(clause).toBe(' AND project = ?');
    expect(params).toEqual(['nexus']);
  });

  it('handles all filters combined', () => {
    const { clause, params } = getFilteringClauses({
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      activeFilter: 'decision',
      collapsedProjects: ['x', 'y'],
      focusProject: 'nexus',
    });
    expect(clause).toBe(
      ' AND date(created_at) BETWEEN date(?) AND date(?)' +
        ' AND type = ?' +
        ' AND project NOT IN (?,?)' +
        ' AND project = ?'
    );
    expect(params).toEqual(['2024-01-01', '2024-06-30', 'decision', 'x', 'y', 'nexus']);
  });

  it('ignores empty collapsedProjects array', () => {
    const { clause, params } = getFilteringClauses({ collapsedProjects: [] });
    expect(clause).toBe('');
    expect(params).toEqual([]);
  });
});

describe('buildFtsSearchQuery', () => {
  it('rewrites project to o.project', () => {
    const clause = ' AND project = ?';
    const sql = buildFtsSearchQuery(clause);
    expect(sql).toContain('o.project');
    expect(sql).not.toContain(' project =');
  });

  it('rewrites created_at to o.created_at', () => {
    const clause = ' AND date(created_at) >= date(?)';
    const sql = buildFtsSearchQuery(clause);
    expect(sql).toContain('o.created_at');
    expect(sql).not.toMatch(/(?<!o\.)created_at/);
  });

  it('rewrites type to o.type', () => {
    const clause = ' AND type = ?';
    const sql = buildFtsSearchQuery(clause);
    expect(sql).toContain('o.type');
  });

  it('joins observations_fts', () => {
    const sql = buildFtsSearchQuery('');
    expect(sql).toContain('JOIN observations_fts fts ON o.id = fts.rowid');
    expect(sql).toContain('WHERE observations_fts MATCH ?');
  });
});

describe('buildTrailQuery', () => {
  it('wraps conditions in WHERE deleted_at IS NULL AND (...)', () => {
    const sql = buildTrailQuery("topic_key = ? OR (session_id = ? AND session_id != 'manual-save')");
    expect(sql).toContain('WHERE deleted_at IS NULL AND (');
    expect(sql).toContain("topic_key = ? OR (session_id = ? AND session_id != 'manual-save')");
    expect(sql).toContain('ORDER BY created_at ASC');
  });
});

describe('buildGraphDataQuery', () => {
  it('appends clause after WHERE deleted_at IS NULL', () => {
    const sql = buildGraphDataQuery(' AND type = ?');
    expect(sql).toContain('WHERE deleted_at IS NULL  AND type = ?');
    expect(sql).toContain('LIMIT ?');
  });
});
