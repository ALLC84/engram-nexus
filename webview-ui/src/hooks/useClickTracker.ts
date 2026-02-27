import { useRef } from "react";
import type { EngramNode } from "../types/graph.d";

interface ClickTrackerState {
  time: number;
  nodeId: string | number | null;
  timeout: ReturnType<typeof setTimeout> | null;
}

interface UseClickTrackerOptions {
  /** Called after the 250 ms debounce window when no second click arrives. */
  onSingleClick: (node: EngramNode) => void;
  /** Called immediately when a second click arrives within 300 ms. */
  onDoubleClick: (node: EngramNode) => void;
  /**
   * Predicate controlling whether debounce tracking applies to a given node.
   * Nodes that return `false` trigger `onSingleClick` instantly without delay.
   */
  shouldDebounce: (node: EngramNode) => boolean;
}

/**
 * Discriminates between single and double clicks on graph nodes using a 250 ms
 * debounce window. Nodes that pass `shouldDebounce` wait before firing
 * `onSingleClick`, allowing a second click to trigger `onDoubleClick` instead.
 * Non-debounced nodes (e.g. standard observation nodes) respond instantly.
 */
export function useClickTracker({
  onSingleClick,
  onDoubleClick,
  shouldDebounce,
}: UseClickTrackerOptions) {
  const tracker = useRef<ClickTrackerState>({
    time: 0,
    nodeId: null,
    timeout: null,
  });

  const handleNodeClick = (node: EngramNode) => {
    if (!shouldDebounce(node)) {
      onSingleClick(node);
      return;
    }

    const now = Date.now();
    const isDoubleClick =
      now - tracker.current.time < 300 && tracker.current.nodeId === (node.id ?? null);

    if (isDoubleClick) {
      if (tracker.current.timeout !== null) {
        clearTimeout(tracker.current.timeout);
        tracker.current.timeout = null;
      }
      onDoubleClick(node);
      tracker.current.time = 0;
    } else {
      tracker.current.time = now;
      tracker.current.nodeId = node.id ?? null;
      if (tracker.current.timeout !== null) {
        clearTimeout(tracker.current.timeout);
      }
      tracker.current.timeout = setTimeout(() => {
        onSingleClick(node);
        tracker.current.timeout = null;
      }, 250);
    }
  };

  return handleNodeClick;
}
