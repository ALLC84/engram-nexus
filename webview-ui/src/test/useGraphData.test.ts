import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { IPC_CHANNELS } from '../constants/ipc';

// Mock the vscode module before importing the hook
vi.mock('../vscode', () => ({
  vscode: {
    postMessage: vi.fn(),
    getState: vi.fn(() => ({})),
    setState: vi.fn(),
  },
}));

import { useGraphData } from '../hooks/useGraphData';
import { vscode } from '../vscode';

const mockedPostMessage = vi.mocked(vscode.postMessage);

function dispatchMessage(command: string, payload: unknown) {
  const event = new MessageEvent('message', { data: { command, payload } });
  window.dispatchEvent(event);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGraphData — triggerSearch', () => {
  it('posts SEARCH message with searchTerm and filters', () => {
    const { result } = renderHook(() => useGraphData());

    act(() => {
      result.current.triggerSearch('foo', '2024-01-01', '2024-12-31', 'bugfix', new Set(['collapsed-proj']), 'nexus');
    });

    expect(mockedPostMessage).toHaveBeenCalledWith({
      command: IPC_CHANNELS.SEARCH,
      payload: {
        searchTerm: 'foo',
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          activeFilter: 'bugfix',
          collapsedProjects: ['collapsed-proj'],
          focusProject: 'nexus',
        },
      },
    });
  });

  it('converts collapsedProjects Set to Array in payload', () => {
    const { result } = renderHook(() => useGraphData());

    act(() => {
      result.current.triggerSearch('', '', '', null, new Set(['a', 'b']), null);
    });

    const call = mockedPostMessage.mock.calls[0][0] as { payload: { filters: { collapsedProjects: string[] } } };
    expect(Array.isArray(call.payload.filters.collapsedProjects)).toBe(true);
    expect(call.payload.filters.collapsedProjects).toContain('a');
    expect(call.payload.filters.collapsedProjects).toContain('b');
  });

  it('sets isLoading to true when triggerSearch is called', () => {
    const { result } = renderHook(() => useGraphData());

    act(() => {
      result.current.triggerSearch('term', '', '', null, new Set());
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useGraphData — DATA_LOADED message', () => {
  it('updates graphData and sets isLoading=false on DATA_LOADED', () => {
    const { result } = renderHook(() => useGraphData());

    const graphPayload = { nodes: [{ id: '1', name: 'Test' }], links: [], projects: [], allProjects: [] };

    act(() => {
      dispatchMessage(IPC_CHANNELS.DATA_LOADED, graphPayload);
    });

    expect(result.current.graphData).toEqual(graphPayload);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useGraphData — ERROR message', () => {
  it('sets error and isLoading=false on ERROR message', () => {
    const { result } = renderHook(() => useGraphData());

    act(() => {
      // Set loading first
      result.current.triggerSearch('term', '', '', null, new Set());
    });

    act(() => {
      dispatchMessage(IPC_CHANNELS.ERROR, 'Something went wrong');
    });

    expect(result.current.error).toBe('Something went wrong');
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useGraphData — TRAIL_LOADED message', () => {
  it('updates trailObservations on TRAIL_LOADED', () => {
    const { result } = renderHook(() => useGraphData());

    const trailPayload = [
      { id: 1, title: 'T1', content: '', type: 'decision', created_at: '2024-01-01' },
    ];

    act(() => {
      dispatchMessage(IPC_CHANNELS.TRAIL_LOADED, trailPayload);
    });

    expect(result.current.trailObservations).toEqual(trailPayload);
  });
});

describe('useGraphData — fetchTrail', () => {
  it('posts GET_TRAIL message with trail payload', () => {
    const { result } = renderHook(() => useGraphData());

    act(() => {
      result.current.fetchTrail({ topicKey: 'auth/jwt', sessionId: 'sess-abc' });
    });

    expect(mockedPostMessage).toHaveBeenCalledWith({
      command: IPC_CHANNELS.GET_TRAIL,
      payload: { topicKey: 'auth/jwt', sessionId: 'sess-abc' },
    });
  });
});

describe('useGraphData — clearTrail', () => {
  it('resets trailObservations to []', () => {
    const { result } = renderHook(() => useGraphData());

    act(() => {
      dispatchMessage(IPC_CHANNELS.TRAIL_LOADED, [
        { id: 1, title: 'T1', content: '', type: 'decision', created_at: '2024-01-01' },
      ]);
    });

    expect(result.current.trailObservations).toHaveLength(1);

    act(() => {
      result.current.clearTrail();
    });

    expect(result.current.trailObservations).toEqual([]);
  });
});
