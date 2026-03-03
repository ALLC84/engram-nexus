import { useRef, useEffect } from "react";
import { forceCollide } from "d3-force";
import type { EngramGraphData, EngramLink, EngramNode } from "../types/graph.d";

const SOMA_TYPE = "system";
const PROJECT_TYPE = "project";
const TYPE_HUB_TYPE = "type_hub";

/** Radius of the ring on which project hubs are pinned around SOMA. */
const PROJECT_RING_RADIUS = 150;
/** Orbit radius at which Type Hubs are seeded around their project hub. */
const TYPE_HUB_ORBIT_RADIUS = 50;
/** Orbit radius at which observations are seeded around their Type Hub. */
const OBS_CLUSTER_RADIUS = 6;
/** Strength of the per-project/per-type radial orbit force. */
const CLUSTER_STRENGTH = 0.4;

/**
 * Configures hub-and-spoke layout:
 *
 *   SOMA (pinned at center)
 *     └─ Project hubs (pinned equidistant on a circle)
 *          └─ Observations (orbit their hub at OBS_CLUSTER_RADIUS)
 *
 * Timing: everything runs inside a requestAnimationFrame so it executes
 * AFTER react-force-graph's internal node initialisation, which assigns
 * small random jitter positions before the React useEffect fires.
 */
export function useSmartCamera(data: EngramGraphData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  useEffect(() => {
    if (!fgRef.current) return;
    let cancelled = false;

    // Delay one animation frame so react-force-graph finishes its own
    // initialisation before we override positions and forces.
    const raf = requestAnimationFrame(() => {
      if (cancelled || !fgRef.current) return;

      try {
        const fg = fgRef.current;

        // ── 1. Pin SOMA at canvas center ───────────────────────────────────
        const somaNode = data.nodes.find((n) => n.details?.type === SOMA_TYPE);
        if (somaNode) {
          somaNode.fx = 0;
          somaNode.fy = 0;
          somaNode.x = 0;
          somaNode.y = 0;
          somaNode.vx = 0;
          somaNode.vy = 0;
        }

        // ── 2. Pin project nodes equidistant on a ring ─────────────────────
        const projectNodes = data.nodes.filter((n) => n.details?.type === PROJECT_TYPE);
        projectNodes.forEach((proj, i) => {
          const angle = (2 * Math.PI * i) / projectNodes.length - Math.PI / 2;
          proj.fx = Math.cos(angle) * PROJECT_RING_RADIUS;
          proj.fy = Math.sin(angle) * PROJECT_RING_RADIUS;
          proj.x = proj.fx;
          proj.y = proj.fy;
          proj.vx = 0;
          proj.vy = 0;
        });

        // ── 3. Build lookup for Project Hubs ──
        const projectPositions = new Map<string, { x: number; y: number }>();
        projectNodes.forEach((proj) => {
          const projName = proj.details?.project;
          if (projName && proj.fx !== undefined && proj.fy !== undefined) {
            projectPositions.set(projName, { x: proj.fx, y: proj.fy });
          }
        });

        // ── 3.5 Seed and pin Type Hubs around their Project Hubs ──
        const typeHubsMap = new Map<string, EngramNode[]>();
        const typeHubPositions = new Map<string | number, { x: number; y: number }>();

        data.nodes.forEach((node) => {
          if (node.details?.type === TYPE_HUB_TYPE) {
            const projName = node.details?.project ?? "";
            const bucket = typeHubsMap.get(projName);
            if (bucket) bucket.push(node);
            else typeHubsMap.set(projName, [node]);
          }
        });

        typeHubsMap.forEach((hubs, projName) => {
          const projectPos = projectPositions.get(projName);
          if (!projectPos) return;

          hubs.forEach((hub, i) => {
            const angle = (2 * Math.PI * i) / hubs.length;
            hub.fx = projectPos.x + Math.cos(angle) * TYPE_HUB_ORBIT_RADIUS;
            hub.fy = projectPos.y + Math.sin(angle) * TYPE_HUB_ORBIT_RADIUS;
            hub.x = hub.fx;
            hub.y = hub.fy;
            hub.vx = 0;
            hub.vy = 0;

            if (hub.id !== undefined) {
              typeHubPositions.set(hub.id, { x: hub.fx, y: hub.fy });
            }
          });
        });

        // ── 4. Seed observation positions in a circle around their Type Hub ─────
        // We find the parent Type Hub by looking at links, since observations
        // are linked to their Type Hubs (Pass 4 in graphBuilder.ts).
        const obsToHubMap = new Map<string | number, string | number>();
        data.links.forEach((link) => {
          // We are looking for links where source is a TYPE_HUB and target is an observation
          const srcId =
            typeof link.source === "object" && link.source !== null ? link.source.id : link.source;
          const tgtId =
            typeof link.target === "object" && link.target !== null ? link.target.id : link.target;

          if (!srcId || !tgtId) return;

          if (typeof srcId === "string" && srcId.startsWith("type-hub-")) {
            obsToHubMap.set(tgtId, srcId);
          } else if (typeof tgtId === "string" && tgtId.startsWith("type-hub-")) {
            // Unlikely but safe
            obsToHubMap.set(srcId, tgtId);
          }
        });

        const hubObsMap = new Map<string | number, EngramNode[]>();
        data.nodes.forEach((node) => {
          const type = node.details?.type;
          if (type === SOMA_TYPE || type === PROJECT_TYPE || type === TYPE_HUB_TYPE) return;

          if (!node.id) return;
          const parentHubId = obsToHubMap.get(node.id);
          if (!parentHubId) return;

          const bucket = hubObsMap.get(parentHubId);
          if (bucket) bucket.push(node);
          else hubObsMap.set(parentHubId, [node]);
        });

        hubObsMap.forEach((obsNodes, hubId) => {
          const hubPos = typeHubPositions.get(hubId);
          if (!hubPos) return;
          obsNodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / obsNodes.length;
            node.x = hubPos.x + Math.cos(angle) * OBS_CLUSTER_RADIUS;
            node.y = hubPos.y + Math.sin(angle) * OBS_CLUSTER_RADIUS;
            node.vx = 0;
            node.vy = 0;
          });
        });

        // ── 5. Cluster force: keep observations orbiting their Type Hub ─────────
        fg.d3Force("cluster", (alpha: number) => {
          data.nodes.forEach((node: EngramNode) => {
            const type = node.details?.type;
            if (type === SOMA_TYPE || type === PROJECT_TYPE || type === TYPE_HUB_TYPE) return;

            if (!node.id) return;
            const parentHubId = obsToHubMap.get(node.id);
            if (!parentHubId) return;

            const hubPos = typeHubPositions.get(parentHubId);
            if (!hubPos) return;

            const dx = hubPos.x - (node.x ?? 0);
            const dy = hubPos.y - (node.y ?? 0);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.001) return;
            // diff > 0 → pull in; diff < 0 → push out; = 0 → no force
            const diff = dist - OBS_CLUSTER_RADIUS;
            const factor = (diff / dist) * CLUSTER_STRENGTH * alpha;
            node.vx = (node.vx ?? 0) + dx * factor;
            node.vy = (node.vy ?? 0) + dy * factor;
          });
        });

        // ── 6. Collision: spread nodes angularly within each cluster ───────
        fg.d3Force(
          "collision",
          forceCollide((node: EngramNode) => {
            const type = node.details?.type;
            if (type === SOMA_TYPE) return 14;
            if (type === PROJECT_TYPE) return 12;
            if (type === TYPE_HUB_TYPE) return 10;
            return 8;
          }).strength(0.9)
        );

        // ── 7. Charge: local only — clusters must not repel each other ─────
        const chargeForce = fg.d3Force("charge");
        if (chargeForce) {
          chargeForce.strength(-30);
          if (typeof chargeForce.distanceMax === "function") {
            chargeForce.distanceMax(100);
          }
        }

        // ── 8. Link force: session chains shape cluster interior topology ──
        const linkForce = fg.d3Force("link");
        if (linkForce) {
          linkForce.distance((link: EngramLink) => {
            if (link.value === 2) return 30;
            if (link.value >= 1) return 55;
            return 70;
          });
          linkForce.strength((link: EngramLink) => {
            if (link.value === 2) return 0.6;
            if (link.value >= 1) return 0.2;
            return 0.02; // structural: cluster force owns positioning
          });
        }

        // ── 9. Remove radial gravity and center drift — pinned nodes make it redundant ──────
        fg.d3Force("radial", null);
        fg.d3Force("center", null);

        // ── 10. Restart simulation from our seeded positions ───────────────
        fg.d3ReheatSimulation?.();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fg as any)._simulation?.alpha(1).restart();
      } catch (error) {
        console.error("[useSmartCamera] force configuration failed", error);
      }
    });

    const timeout = setTimeout(() => {
      if (!cancelled && fgRef.current) {
        fgRef.current.zoomToFit(700, 60);
      }
    }, 2000);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [data]);

  const zoomToFit = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 50);
    }
  };

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
