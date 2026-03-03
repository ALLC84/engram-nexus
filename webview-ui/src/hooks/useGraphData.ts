import { useState, useEffect } from "react";
import { vscode } from "../vscode";
import { IPC_CHANNELS } from "../constants/ipc";
import type { EngramGraphData, ObservationDetails, SearchPayload, TrailPayload } from "../types/graph.d";

const EMPTY_GRAPH: EngramGraphData = { nodes: [], links: [], projects: [], allProjects: [], observations: [] };

/**
 * Encapsulates all IPC data flow between the Webview and the VS Code extension.
 * Owns the `DATA_LOADED` and `ERROR` message listeners and the `triggerSearch`
 * postMessage call. Components should never call `vscode.postMessage` directly
 * for data fetching — they should call `triggerSearch` from this hook.
 */
export function useGraphData() {
  const [graphData, setGraphData] = useState<EngramGraphData>(EMPTY_GRAPH);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trailObservations, setTrailObservations] = useState<ObservationDetails[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as { command: string; payload: unknown };
      switch (message.command) {
        case IPC_CHANNELS.DATA_LOADED:
          setGraphData(message.payload as EngramGraphData);
          setIsLoading(false);
          setError(null);
          break;
        case IPC_CHANNELS.TRAIL_LOADED:
          setTrailObservations(message.payload as ObservationDetails[]);
          break;
        case IPC_CHANNELS.ERROR:
          setError(message.payload as string);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const fetchTrail = (trail: TrailPayload) => {
    vscode.postMessage({ command: IPC_CHANNELS.GET_TRAIL, payload: trail });
  };

  const clearTrail = () => setTrailObservations([]);

  const triggerSearch = (
    searchTerm: string,
    startDate: string,
    endDate: string,
    activeFilter: string | null,
    collapsedProjects: Set<string>,
    focusProject: string | null = null
  ) => {
    setIsLoading(true);
    const payload: SearchPayload = {
      searchTerm,
      filters: {
        startDate,
        endDate,
        activeFilter,
        collapsedProjects: Array.from(collapsedProjects),
        focusProject: focusProject ?? undefined,
      },
    };
    vscode.postMessage({ command: IPC_CHANNELS.SEARCH, payload });
  };

  return { graphData, isLoading, error, triggerSearch, trailObservations, fetchTrail, clearTrail };
}
