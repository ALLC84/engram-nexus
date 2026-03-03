import { useCallback, useEffect, useRef, type FC } from "react";
import { IconButton } from "../ui/IconButton";
import { Compass } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import { useSmartCamera } from "../../hooks/useSmartCamera";
import type { EngramGraphData, EngramNode, EngramLink } from "../../types/graph.d";
import { SENTINEL_EVENT_TYPES, type SentinelTelemetryEvent } from "../../types/sentinel";

// ── Module-level render constants ─────────────────────────────────────────────
// Allocating array literals inside callbacks (or returning them from accessors)
// creates a new heap object on every invocation. ForceGraph2D calls linkColor,
// linkLineDash, and nodeCanvasObject on *every frame* for every visible element,
// so even a small allocation causes measurable GC churn at 60 FPS.
// Declaring them here ensures a single allocation for the module lifetime.

/** Empty dash array → solid stroke. */
const SOLID_DASH: number[] = [];
/** Dashed stroke pattern for team-authored nodes. */
const TEAM_NODE_DASH: number[] = [0.5, 0.5];
/** Dashed link pattern for edges pointing to team-authored nodes. */
const DASHED_LINK: number[] = [3, 2];

// ── Semantic colour palette ────────────────────────────────────────────────────
// Mirrors the Tailwind colour choices in FilterPanel so nodes and filter buttons
// share the same visual language. Keys are the `type` values from the DB.
const TYPE_COLORS: Record<string, string> = {
  decision: "#f59e0b", // amber-500
  architecture: "#3b82f6", // blue-500
  bugfix: "#ef4444", // red-500
  pattern: "#a855f7", // purple-500
  learning: "#22c55e", // green-500
  session_summary: "#94a3b8", // slate-400
  feature: "#06b6d4", // cyan-500
  config: "#f97316", // orange-500
  discovery: "#10b981", // emerald-500
  manual: "#64748b", // slate-500
};
const SOMA_COLOR = "#ffffff";
const PROJECT_COLOR = "#7aa2f7";
const FALLBACK_COLOR = "#cccccc";
const INVOCATION_PULSE_MS = 1200;
const BLOCK_PULSE_MS = 1500;
const MAX_PARTICLE_EMITS = 6;
const INVOCATION_GREEN = "34,197,94";
const BLOCK_RED = "239,68,68";

interface SentinelPulse {
  type: "invocation" | "block";
  startedAt: number;
  endsAt: number;
}

const canonicalToolKey = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const canonical = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return canonical.length > 0 ? canonical : null;
};

const extractToolCandidates = (value: unknown): string[] => {
  if (typeof value !== "string") return [];
  const raw = value.trim().toLowerCase();
  if (!raw) return [];

  const candidates = new Set<string>([raw]);
  const separators = /[\/\s.:#()\-\[\]]+/g;
  raw
    .split(separators)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .forEach((part) => candidates.add(part));

  if (raw.includes("__")) {
    const parts = raw.split("__").filter((part) => part.length > 0);
    parts.forEach((part) => candidates.add(part));
    candidates.add(parts[parts.length - 1] ?? raw);
  }

  const canonical = canonicalToolKey(raw);
  if (canonical) candidates.add(canonical);

  return Array.from(candidates);
};

const addNodeAlias = (aliases: Map<string, EngramNode>, alias: unknown, node: EngramNode): void => {
  extractToolCandidates(alias).forEach((key) => {
    if (!aliases.has(key)) aliases.set(key, node);
  });
};

interface NetworkGraphProps {
  data: EngramGraphData;
  onNodeClick: (node: EngramNode, event?: MouseEvent) => void;
  onNodeRightClick?: (node: EngramNode, event?: MouseEvent) => void;
  selectedNodeId?: string | number | null;
  width: number;
  height: number;
  isFloating?: boolean;
  floatCorner?: "left" | "right";
  nodeColors?: Record<string, string>;
  lastSentinelEvent?: SentinelTelemetryEvent | null;
  showFloatingCenterButton?: boolean;
  centerGraphSignal?: number;
}

export const NetworkGraph: FC<NetworkGraphProps> = ({
  data,
  onNodeClick,
  onNodeRightClick,
  selectedNodeId = null,
  width,
  height,
  isFloating = false,
  floatCorner = "right",
  nodeColors,
  lastSentinelEvent = null,
  showFloatingCenterButton = true,
  centerGraphSignal = 0,
}) => {
  const { fgRef, zoomToFit, focusNode } = useSmartCamera(data);
  const sentinelPulsesRef = useRef<Map<string | number, SentinelPulse>>(new Map());
  const nodeLookupRef = useRef<Map<string, EngramNode>>(new Map());
  const nodeLinksRef = useRef<Map<string, EngramLink[]>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // ── Hover state for neighborhood dimming (Obsidian-style focus ring) ────────
  const hoveredNodeIdRef = useRef<string | number | null>(null);
  // Precomputed set of direct neighbors of the hovered node — O(1) lookup per frame.
  const hoveredNeighborSetRef = useRef<Set<string | number>>(new Set());

  // ── Dynamic colour ref ───────────────────────────────────────────────────────
  // Synced each render so the stable resolveColor callback ([] deps) can read
  // the latest user-configured palette without being recreated.
  const nodeColorsRef = useRef<Record<string, string>>(nodeColors ?? {});
  nodeColorsRef.current = nodeColors ?? {};

  // Stable colour resolver — reads nodeColorsRef at call-time, falls back to
  // the static palette, then FALLBACK_COLOR for unknown types.
  const resolveColor = useCallback((node: EngramNode): string => {
    const type = node.details?.type;
    if (type === "system") return SOMA_COLOR;
    if (type === "project") return PROJECT_COLOR;

    // Type hubs represent a specific type, stored in their label/name
    if (type === "type_hub" && node.name) {
      const representedType = node.name.toLowerCase();
      return (
        nodeColorsRef.current[representedType] ?? TYPE_COLORS[representedType] ?? FALLBACK_COLOR
      );
    }

    return nodeColorsRef.current[type] ?? TYPE_COLORS[type] ?? FALLBACK_COLOR;
    // nodeColorsRef is a stable ref object — does not need to be in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Selected node ref ────────────────────────────────────────────────────────
  // Synced on every render so nodeCanvasObject (stable [] deps) can read the
  // current selection without being recreated each time selectedNodeId changes.
  const selectedNodeIdRef = useRef<string | number | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  // ── Drag guard ──────────────────────────────────────────────────────────────
  // react-force-graph fires onNodeClick even after a drag ends. We track whether
  // the pointer moved so we can skip the camera animation on drag-release clicks.
  const hasDragged = useRef(false);

  // ── Hover handler — builds the neighbor set on enter, clears on leave ───────
  const handleNodeHover = useCallback((node: EngramNode | null) => {
    hoveredNodeIdRef.current = node?.id ?? null;
    if (node?.id !== undefined && node.id !== null) {
      const neighbors = new Set<string | number>();
      const links = nodeLinksRef.current.get(String(node.id)) ?? [];
      links.forEach((link) => {
        const src = link.source as EngramNode | string | number;
        const tgt = link.target as EngramNode | string | number;
        const srcId = typeof src === "object" && src !== null ? src.id : src;
        const tgtId = typeof tgt === "object" && tgt !== null ? tgt.id : tgt;
        if (srcId !== undefined && srcId !== null && srcId !== node.id) neighbors.add(srcId);
        if (tgtId !== undefined && tgtId !== null && tgtId !== node.id) neighbors.add(tgtId);
      });
      hoveredNeighborSetRef.current = neighbors;
    } else {
      hoveredNeighborSetRef.current = new Set();
    }
  }, []);

  // ── Internal click handler ──────────────────────────────────────────────────
  const handleNodeClick = useCallback(
    (node: EngramNode, event?: MouseEvent) => {
      if (hasDragged.current) return;
      focusNode(node);
      onNodeClick(node, event);
    },
    // focusNode and onNodeClick are stable references — no deps churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onNodeClick]
  );

  const ensurePulseAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) return;

    const tick = (timestamp: number) => {
      let hasActivePulse = false;
      sentinelPulsesRef.current.forEach((pulse, nodeId) => {
        if (timestamp >= pulse.endsAt) {
          sentinelPulsesRef.current.delete(nodeId);
          return;
        }
        hasActivePulse = true;
      });

      if (!hasActivePulse) {
        animationFrameRef.current = null;
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fgRef.current as any)?.refresh?.();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [fgRef]);

  const resolveSentinelNode = useCallback((event: SentinelTelemetryEvent): EngramNode | null => {
    const rawCandidates = [
      event.tool,
      event.raw.tool,
      event.raw.toolName,
      event.raw.tool_name,
      event.raw.targetTool,
      event.raw.target_tool,
      event.summary,
    ];

    const toolCandidates = rawCandidates.flatMap((candidate) => extractToolCandidates(candidate));
    const aliasMap = nodeLookupRef.current;

    for (const candidate of toolCandidates) {
      const matched = aliasMap.get(candidate);
      if (matched) return matched;
    }
    return null;
  }, []);

  useEffect(() => {
    const aliases = new Map<string, EngramNode>();
    const linksByNodeId = new Map<string, EngramLink[]>();

    data.nodes.forEach((node) => {
      // Strong link only: Sentinel tool should map to observation author/tool_name.
      // Avoid title/name fuzziness to keep semantic integrity of highlights.
      addNodeAlias(aliases, node.details?.author, node);
    });

    data.links.forEach((link) => {
      const sourceNode = link.source as EngramNode | string | number;
      const targetNode = link.target as EngramNode | string | number;
      const sourceId =
        typeof sourceNode === "object" && sourceNode !== null ? sourceNode.id : sourceNode;
      const targetId =
        typeof targetNode === "object" && targetNode !== null ? targetNode.id : targetNode;

      [sourceId, targetId].forEach((candidateId) => {
        if (candidateId === undefined || candidateId === null) return;
        const key = String(candidateId);
        const bucket = linksByNodeId.get(key);
        if (bucket) {
          bucket.push(link);
        } else {
          linksByNodeId.set(key, [link]);
        }
      });
    });

    nodeLookupRef.current = aliases;
    nodeLinksRef.current = linksByNodeId;
  }, [data]);

  useEffect(() => {
    if (!lastSentinelEvent) return;
    if (
      lastSentinelEvent.type !== SENTINEL_EVENT_TYPES.INVOCATION &&
      lastSentinelEvent.type !== SENTINEL_EVENT_TYPES.BLOCK
    ) {
      return;
    }

    const targetNode = resolveSentinelNode(lastSentinelEvent);
    if (!targetNode?.id) return;

    const startedAt = performance.now();
    const isInvocation = lastSentinelEvent.type === SENTINEL_EVENT_TYPES.INVOCATION;
    const endsAt = startedAt + (isInvocation ? INVOCATION_PULSE_MS : BLOCK_PULSE_MS);

    sentinelPulsesRef.current.set(targetNode.id, {
      type: isInvocation ? "invocation" : "block",
      startedAt,
      endsAt,
    });

    if (isInvocation) {
      const links = nodeLinksRef.current.get(String(targetNode.id)) ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graphRef = fgRef.current as any;
      if (typeof graphRef?.emitParticle === "function") {
        links.slice(0, MAX_PARTICLE_EMITS).forEach((link) => {
          graphRef.emitParticle(link);
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fgRef.current as any)?.refresh?.();
    ensurePulseAnimationLoop();
  }, [ensurePulseAnimationLoop, fgRef, lastSentinelEvent, resolveSentinelNode]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (centerGraphSignal <= 0) return;
    zoomToFit();
  }, [centerGraphSignal, zoomToFit]);

  // ── Stable canvas renderer ──────────────────────────────────────────────────
  // useCallback with [] deps gives a permanent stable reference.
  // Theme colours are read via getComputedStyle at draw-time, so no deps needed.
  const nodeCanvasObject = useCallback(
    (node: EngramNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name;

      // Node sizing: soma=5→r7.5 | project=3→r4.5 | observation=1→r1.5
      const val = node.val;
      const radius = val ? val * 1.5 : 2;
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI, false);

      const isTeamNode =
        node.details &&
        node.details.scope !== "personal" &&
        !!node.details.author &&
        node.details.author.trim() !== "";

      // Neighborhood dimming: non-neighbor nodes fade to near-invisible on hover.
      const hoveredId = hoveredNodeIdRef.current;
      const isDimmed =
        hoveredId !== null &&
        node.id !== hoveredId &&
        !hoveredNeighborSetRef.current.has(node.id as string | number);

      if (isTeamNode) {
        ctx.setLineDash(TEAM_NODE_DASH); // stable reference, no per-frame alloc
        ctx.globalAlpha = isDimmed ? 0.06 : 0.4;
      } else {
        ctx.setLineDash(SOLID_DASH);
        ctx.globalAlpha = isDimmed ? 0.06 : 1.0;
      }

      ctx.fillStyle = resolveColor(node);
      ctx.fill();

      // Subtle stroke for clarity
      if (globalScale > 3 || val > 1 || isTeamNode) {
        ctx.strokeStyle = isTeamNode
          ? getComputedStyle(document.body).getPropertyValue("--nexus-accent") || "#8b5cf6"
          : getComputedStyle(document.body).getPropertyValue("--nexus-text-muted") + "33";
        ctx.lineWidth = (isTeamNode ? 1.5 : 0.5) / globalScale;
        ctx.stroke();
      }

      ctx.setLineDash(SOLID_DASH);
      ctx.globalAlpha = 1.0;

      // ── Selection ring ────────────────────────────────────────────────────────
      // Drawn after the fill so it sits on top. Uses the accent CSS variable to
      // stay consistent with the theme. A soft outer glow (shadow) + a crisp
      // inner stroke give depth without being intrusive.
      if (node.id === selectedNodeIdRef.current) {
        const accent =
          getComputedStyle(document.body).getPropertyValue("--nexus-accent").trim() || "#8b5cf6";
        const ringRadius = radius + 3 / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius + 2 / globalScale, 0, 2 * Math.PI, false);
        ctx.strokeStyle = accent + "44"; // ~27 % opacity
        ctx.lineWidth = 4 / globalScale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.2 / globalScale;
        ctx.stroke();
      }

      const pulse =
        node.id !== undefined && node.id !== null
          ? sentinelPulsesRef.current.get(node.id)
          : undefined;
      if (pulse) {
        const now = performance.now();
        const duration = Math.max(1, pulse.endsAt - pulse.startedAt);
        const progress = Math.min(1, Math.max(0, (now - pulse.startedAt) / duration));
        const fade = 1 - progress;

        if (pulse.type === "invocation") {
          const wave = 0.5 + 0.5 * Math.sin(progress * Math.PI * 8);
          const ringRadius = radius + (4 + wave * 8) / globalScale;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, 2 * Math.PI, false);
          ctx.strokeStyle = `rgba(${INVOCATION_GREEN}, ${0.15 + fade * 0.7})`;
          ctx.lineWidth = (1.25 + wave * 1.75) / globalScale;
          ctx.stroke();
        } else {
          const oscillation = Math.abs(Math.sin(now * 0.04));
          const ringRadius = radius + (6 + oscillation * 10) / globalScale;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, 2 * Math.PI, false);
          ctx.strokeStyle = `rgba(${BLOCK_RED}, ${0.35 + fade * 0.6})`;
          ctx.lineWidth = (2 + oscillation * 3.5) / globalScale;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, radius + 2 / globalScale, 0, 2 * Math.PI, false);
          ctx.fillStyle = `rgba(${BLOCK_RED}, ${0.08 + fade * 0.22})`;
          ctx.fill();
        }
      }

      // Semantic zoom: labels for root/projects (val > 2), explicitly hovered nodes, OR when zoomed in
      const isHovered = hoveredId !== null && node.id === hoveredId;
      if (!isDimmed && (val > 2 || isHovered || globalScale > 3.5)) {
        const fontSize = (val > 1 ? 12 : 9) / globalScale;
        ctx.font = `${val > 1 ? "bold " : ""}${fontSize}px Inter, -apple-system, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const textColorVar = val > 1 ? "--nexus-text-bright" : "--nexus-text-muted";
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue(textColorVar);
        ctx.fillText(label || "", x, y + radius + (val > 1 ? 12 : 9) / globalScale);
      }
    },
    []
  );

  // ── Stable link colour accessor ─────────────────────────────────────────────
  // Obsidian-style: edges at ~20% base opacity. On hover, incident edges highlight
  // at 80% and non-incident edges drop to ~4% — creating a clean focus ring effect.
  const getLinkColor = useCallback((link: EngramLink): string => {
    const targetNode = link.target as EngramNode;

    const borderColor = getComputedStyle(document.body).getPropertyValue("--nexus-border").trim();
    const isTeamTarget =
      targetNode?.details?.scope !== "personal" &&
      !!targetNode?.details?.author &&
      targetNode.details.author.trim() !== "";
    const accent =
      getComputedStyle(document.body).getPropertyValue("--nexus-accent").trim() || "#8b5cf6";

    const hoveredId = hoveredNodeIdRef.current;
    if (hoveredId !== null) {
      const src = link.source as EngramNode | string | number;
      const tgt = link.target as EngramNode | string | number;
      const srcId = typeof src === "object" && src !== null ? src.id : src;
      const tgtId = typeof tgt === "object" && tgt !== null ? tgt.id : tgt;
      const isIncident = srcId === hoveredId || tgtId === hoveredId;
      if (isTeamTarget) return isIncident ? accent + "CC" : accent + "22";
      return borderColor + (isIncident ? "EE" : "15"); // ~93% vs ~8%
    }

    if (isTeamTarget) return accent + "66";
    return borderColor + "44"; // ~26% base opacity (Increased from 20%)
  }, []);

  // ── Stable link dash accessor ───────────────────────────────────────────────
  // Returns the module-level constant so no array is allocated per link per frame.
  const getLinkLineDash = useCallback((link: EngramLink): number[] | null => {
    const targetNode = link.target as EngramNode;
    const isTeamTarget =
      targetNode?.details?.scope !== "personal" &&
      !!targetNode?.details?.author &&
      targetNode.details.author.trim() !== "";
    return isTeamTarget ? DASHED_LINK : null;
  }, []);

  // ── Stable tooltip label ────────────────────────────────────────────────────
  // Suppressed whenever the canvas renderer is already drawing the label, which
  // happens for: large nodes (val > 1), hovered nodes, or high zoom (> 3.5).
  // The condition mirrors nodeCanvasObject so there is never a duplicate.
  const getNodeLabel = useCallback(
    (node: EngramNode): string => {
      const val = node.val;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalScale = (fgRef.current as any)?.zoom() || 1;
      const isDrawnOnCanvas =
        globalScale > 3.5 || val > 1 || hoveredNodeIdRef.current === node.id;
      // Empty string suppresses the tooltip; the library does not render it.
      return isDrawnOnCanvas ? "" : (node.name as string);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-transparent">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        nodeCanvasObject={nodeCanvasObject}
        nodeColor={resolveColor}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkWidth={(link) => {
          const val = (link as EngramLink).value;
          if (val >= 1.0) return 1.8; // Root -> Project
          if (val >= 0.8) return 1.2; // Project -> Type Hub
          return 0.8; // Type Hub -> Observation
        }}
        backgroundColor="transparent"
        linkColor={getLinkColor}
        linkLineDash={getLinkLineDash}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onNodeDrag={() => {
          hasDragged.current = true;
        }}
        onNodeDragEnd={() => {
          hasDragged.current = false;
        }}
        onNodeRightClick={onNodeRightClick}
        nodeLabel={getNodeLabel}
        width={width}
        height={height}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.3}
      />
      {showFloatingCenterButton && (
        <div
          className={`absolute bottom-6 z-40 ${isFloating && floatCorner === "right" ? "left-6" : "right-6"}`}
        >
          <IconButton
            onClick={zoomToFit}
            size="none"
            rounded="full"
            inactiveClassName="text-nexus-text-muted hover:text-nexus-text-bright hover:bg-nexus-bg/80"
            tooltip="Center graph"
            tooltipPosition={isFloating && floatCorner === "right" ? "top-left" : "top-right"}
            className="p-2 bg-nexus-sidebar border border-nexus-border shadow-lg active:scale-95"
          >
            <Compass size={20} />
          </IconButton>
        </div>
      )}
    </div>
  );
};
