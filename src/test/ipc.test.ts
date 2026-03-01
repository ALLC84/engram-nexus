import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../constants/ipc';

describe('IPC_CHANNELS integrity', () => {
  it('all values are strings', () => {
    for (const [key, value] of Object.entries(IPC_CHANNELS)) {
      expect(typeof value, `IPC_CHANNELS.${key} should be a string`).toBe('string');
    }
  });

  it('all values are unique (no duplicates)', () => {
    const values = Object.values(IPC_CHANNELS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('has exactly the documented channels', () => {
    const expectedKeys = [
      'FETCH_DATA',
      'SEARCH',
      'GET_SETTINGS',
      'INJECT_CONTEXT',
      'GET_TRAIL',
      'DATA_LOADED',
      'ERROR',
      'SETTINGS_LOADED',
      'REFRESH_DATA',
      'TRAIL_LOADED',
    ];
    expect(Object.keys(IPC_CHANNELS).sort()).toEqual(expectedKeys.sort());
  });

  it('SEARCH channel value is "search"', () => {
    expect(IPC_CHANNELS.SEARCH).toBe('search');
  });

  it('DATA_LOADED channel value is "dataLoaded"', () => {
    expect(IPC_CHANNELS.DATA_LOADED).toBe('dataLoaded');
  });

  it('GET_TRAIL channel value is "getTrail"', () => {
    expect(IPC_CHANNELS.GET_TRAIL).toBe('getTrail');
  });

  it('TRAIL_LOADED channel value is "trailLoaded"', () => {
    expect(IPC_CHANNELS.TRAIL_LOADED).toBe('trailLoaded');
  });

  it('ERROR channel value is "error"', () => {
    expect(IPC_CHANNELS.ERROR).toBe('error');
  });
});
