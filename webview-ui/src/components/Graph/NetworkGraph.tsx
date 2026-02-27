import { useCallback, useRef, type FC } from "react";
import { IconButton } from "../ui/IconButton";
import { Compass } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import { useSmartCamera } from "../../hooks/useSmartCamera";
import type { EngramGraphData, EngramNode, EngramLink } from "../../types/graph.d";

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
}) => {
  const { fgRef, zoomToFit, focusNode } = useSmartCamera(data);

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

      const isTeamNode = node.details && node.details.author && node.details.author.trim() !== "";

      if (isTeamNode) {
        ctx.setLineDash(TEAM_NODE_DASH); // stable reference, no per-frame alloc
        ctx.globalAlpha = 0.4;
      } else {
        ctx.setLineDash(SOLID_DASH);
        ctx.globalAlpha = 1.0;
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

      // Semantic zoom: labels only for root/projects, or when zoomed in
      if (globalScale > 3.5 || val > 1) {
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
  // Reads the current VS Code CSS variable at call-time so theme switches are
  // reflected without needing a deps change or re-registration.
  const getLinkColor = useCallback((link: EngramLink): string => {
    const targetNode = link.target as EngramNode;
    const isTeamTarget = targetNode?.details?.author && targetNode.details.author.trim() !== "";
    if (isTeamTarget) {
      const accent =
        getComputedStyle(document.body).getPropertyValue("--nexus-accent").trim() || "#8b5cf6";
      return accent + "44"; // ~27 % opacity
    }
    return getComputedStyle(document.body).getPropertyValue("--nexus-border");
  }, []);

  // ── Stable link dash accessor ───────────────────────────────────────────────
  // Returns the module-level constant so no array is allocated per link per frame.
  const getLinkLineDash = useCallback((link: EngramLink): number[] | null => {
    const targetNode = link.target as EngramNode;
    const isTeamTarget = targetNode?.details?.author && targetNode.details.author.trim() !== "";
    return isTeamTarget ? DASHED_LINK : null;
  }, []);

  // ── Stable tooltip label ────────────────────────────────────────────────────
  // Suppressed when the label is already rendered on canvas to avoid duplicates.
  // fgRef is a stable ref object — does not need to be listed in deps.
  const getNodeLabel = useCallback(
    (node: EngramNode): string => {
      const val = node.val;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalScale = (fgRef.current as any)?.zoom() || 1;
      const isLabelVisible = globalScale > 3.5 || val > 1;
      // Empty string suppresses the tooltip; the library does not render it.
      return isLabelVisible ? "" : (node.name as string);
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
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.005}
        backgroundColor="transparent"
        linkColor={getLinkColor}
        linkLineDash={getLinkLineDash}
        onNodeClick={handleNodeClick}
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
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
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
    </div>
  );
};
