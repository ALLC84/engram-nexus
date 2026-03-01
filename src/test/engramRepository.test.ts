import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDatabase before importing the repository
vi.mock('../database/sqliteClient', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../database/sqliteClient';
import { getTrailData } from '../backend/repository/engramRepository';

type MockDb = {
  all: (query: string, params: unknown[], cb: (err: null, rows: unknown[]) => void) => void;
  close: () => void;
};

function makeMockDb(rows: unknown[] = []): MockDb {
  const db: MockDb = {
    close: vi.fn(),
    all: vi.fn((_query, _params, cb: (err: null, rows: unknown[]) => void) => {
      cb(null, rows);
      db.close();
    }),
  };
  return db;
}

const mockedGetDatabase = vi.mocked(getDatabase);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTrailData', () => {
  it('returns [] when called with no args', async () => {
    const result = await getTrailData();
    expect(result).toEqual([]);
    expect(mockedGetDatabase).not.toHaveBeenCalled();
  });

  it('returns [] when sessionId is "manual-save"', async () => {
    const result = await getTrailData(undefined, 'manual-save');
    expect(result).toEqual([]);
    expect(mockedGetDatabase).not.toHaveBeenCalled();
  });

  it('queries DB when topicKey is provided', async () => {
    const mockObs = [
      { id: 1, title: 'Test', content: '', type: 'learning', created_at: '2024-01-01' },
    ];
    mockedGetDatabase.mockResolvedValue(makeMockDb(mockObs) as never);
    const result = await getTrailData('auth/jwt');
    expect(mockedGetDatabase).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('queries DB when sessionId is a valid (non manual-save) id', async () => {
    const mockObs = [
      { id: 2, title: 'Obs', content: '', type: 'decision', created_at: '2024-01-01' },
    ];
    mockedGetDatabase.mockResolvedValue(makeMockDb(mockObs) as never);
    const result = await getTrailData(undefined, 'session-abc');
    expect(mockedGetDatabase).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
  });
});
