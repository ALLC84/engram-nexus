import { useRef, useEffect } from "react";
import { forceRadial } from "d3-force";
import type { EngramGraphData, EngramLink, EngramNode } from "../types/graph.d";

// ── Module-level D3 force callbacks ────────────────────────────────────────────
// These are pure functions of the link data only. Declaring them at module scope
// means they are created exactly once, not on every useEffect execution triggered
// by a data change (search / filter). Passing the same function reference to
// linkForce.distance / .strength on subsequent calls is a no-op in D3.

/** Structural links (value ≥ 1) are shorter; organic semantic links are looser. */
const LINK_DISTANCE = (link: EngramLink): number => (link.value >= 1 ? 30 : 60);

/** Structural links pull harder; organic links stay loosely connected. */
const LINK_STRENGTH = (link: EngramLink): number => (link.value >= 1 ? 0.8 : 0.2);

/**
 * Encapsulates the ForceGraph2D imperative camera operations.
 *
 * Whenever `data` changes:
 *  1. Reconfigures charge and link forces for Engram's visual hierarchy.
 *  2. Fires a deferred `zoomToFit` via `setTimeout(..., 50)` to let physics
 *     settle before framing — this is the "Event Loop hack" described in the
 *     architecture checklist.
 *
 * Returns the `fgRef` to attach to `<ForceGraph2D>` and a stable `zoomToFit`
 * callback for the manual "Center graph" button.
 *
 * Note: `fgRef` is typed as `any` because react-force-graph-2d's ref handle
 * type (`ForceGraphMethods<N, L>`) requires the full parameterised graph types,
 * and `ForceGraph2D` itself is imported without type declarations (@ts-ignore).
 * The interface is therefore kept loose here — all call sites are safe because
 * we guard with `if (fgRef.current)` before every imperative call.
 */
export function useSmartCamera(data: EngramGraphData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  useEffect(() => {
    if (!fgRef.current) return;

    const chargeForce = fgRef.current.d3Force("charge");
    if (chargeForce) {
      // Increased repulsion to prevent overlap in the dense core
      chargeForce.strength(-120);
      if (typeof chargeForce.distanceMax === "function") {
        chargeForce.distanceMax(200);
      }
    }

    // Add radial force to create a "gravity well" pulling nodes to center (Obsidian style)
    // 0,0,0 is the center of the coordinate system
    fgRef.current.d3Force("radial", forceRadial(0, 0, 0).strength(0.8));

    const linkForce = fgRef.current.d3Force("link");
    if (linkForce) {
      // Module-level constants passed by reference — no closure created here.
      linkForce.distance(LINK_DISTANCE);
      linkForce.strength(LINK_STRENGTH);
    }

    const timeout = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(600, 50);
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [data]);

  const zoomToFit = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 50);
    }
  };

  /**
   * Smoothly pans and zooms to a given node.
   * Safe to call even if the node coordinates are not yet settled — guards on
   * `node.x` / `node.y` being numeric before invoking the imperative API.
   */
  const focusNode = (node: EngramNode) => {
    if (!fgRef.current) return;
    const x = node.x;
    const y = node.y;
    if (typeof x !== "number" || typeof y !== "number") return;
    fgRef.current.centerAt(x, y, 800);
    fgRef.current.zoom(4, 800);
  };

  return { fgRef, zoomToFit, focusNode };
}
