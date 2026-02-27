import { useState, useEffect, useRef } from "react";
import { SearchBar } from "./components/SearchBar";
import { NetworkGraph } from "./components/Graph/NetworkGraph";
import { Calendar } from "./components/Calendar";
import { NodeDetails } from "./components/Sidebar/NodeDetails";
import { TimelineView } from "./components/Timeline/TimelineView";
import { FilterPanel } from "./components/Sidebar/FilterPanel";
import { IconButton } from "./components/ui/IconButton";
import { OBSERVATION_TYPES, GRAPH_STATES } from "./constants/types";
import { IPC_CHANNELS } from "./constants/ipc";
import { useGraphData } from "./hooks/useGraphData";
import { useGraphSettings } from "./hooks/useGraphSettings";
import { useClickTracker } from "./hooks/useClickTracker";
import {
  Calendar as CalendarIcon,
  Globe,
  FilterX,
  Sun,
  Moon,
  PanelLeft,
  PanelRight,
  FolderOpen,
  Folder,
  Crosshair,
} from "lucide-react";
import type { EngramNode } from "./types/graph.d";

function App() {
  // ── Custom Hooks ─────────────────────────────────────────────────────────
  const { graphData, isLoading, error, triggerSearch, trailObservations, fetchTrail, clearTrail } =
    useGraphData();
  const {
    floatCorner,
    floatThreshold,
    filterPanelSide,
    defaultGraphState,
    settingsLoaded,
    isDark,
    nodeColors,
    toggleTheme,
    toggleCorner,
  } = useGraphSettings();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<EngramNode | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTrail, setActiveTrail] = useState<{
    topicKey?: string;
    sessionId?: string;
    projectId?: string;
  } | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [focusProject, setFocusProject] = useState<string | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const [isFocusOpen, setIsFocusOpen] = useState(false);

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const hasInitializedProjectClustering = useRef(false);
  const prevDefaultGraphState = useRef<string | null>(null);
  const focusDropdownRef = useRef<HTMLDivElement>(null);

  // Full DB project list for the Focus Mode dropdown (never filtered).
  const allProjectIds = graphData.allProjects;
  // Projects in the current graph view for collapse/expand controls.
  const visibleProjectIds = graphData.projects;

  const allCollapsed =
    visibleProjectIds.length > 0 && visibleProjectIds.every((id) => collapsedProjects.has(id));

  // Float mode: calendar becomes absolute overlay when panel is wide enough
  const isFloating = graphSize.width > floatThreshold;

  // ── Interactions ──────────────────────────────────────────────────────────
  const toggleProjectCollapse = (projectId: string) => {
    if (!projectId) return;
    setCollapsedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleAllProjects = () => {
    if (allCollapsed) {
      setCollapsedProjects(new Set());
    } else {
      setCollapsedProjects(new Set(visibleProjectIds));
    }
  };

  const handleFocusProject = (project: string | null) => {
    setFocusProject(project);
    // Clear collapsed state when entering Focus Mode to avoid conflicting filters
    if (project) setCollapsedProjects(new Set());
  };

  const handleNodeClick = useClickTracker({
    onSingleClick: setSelectedNode,
    onDoubleClick: (node) => {
      if (node.details.type === OBSERVATION_TYPES.PROJECT && node.details.project) {
        toggleProjectCollapse(node.details.project);
      }
    },
    shouldDebounce: (node) => node.details.type === OBSERVATION_TYPES.PROJECT,
  });

  // ── Side Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!graphContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setGraphSize({ width, height });
      }
    });

    observer.observe(graphContainerRef.current);
    return () => observer.disconnect();
  }, [showCalendar]); // Re-run when calendar toggles to ensure fresh measurements

  useEffect(() => {
    if (settingsLoaded) {
      triggerSearch(searchTerm, startDate, endDate, activeFilter, collapsedProjects, focusProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeFilter, collapsedProjects, focusProject, settingsLoaded]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as { command: string; payload: unknown };
      if (message.command === IPC_CHANNELS.REFRESH_DATA) {
        triggerSearch(
          searchTerm,
          startDate,
          endDate,
          activeFilter,
          collapsedProjects,
          focusProject
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, startDate, endDate, activeFilter, collapsedProjects, focusProject]);

  useEffect(() => {
    if (settingsLoaded && graphData.projects.length > 0) {
      if (
        !hasInitializedProjectClustering.current ||
        prevDefaultGraphState.current !== defaultGraphState
      ) {
        if (defaultGraphState === GRAPH_STATES.COLLAPSED) {
          setCollapsedProjects(new Set(visibleProjectIds));
        } else {
          setCollapsedProjects(new Set());
        }
        hasInitializedProjectClustering.current = true;
        prevDefaultGraphState.current = defaultGraphState;
      }
    }
  }, [settingsLoaded, visibleProjectIds, defaultGraphState]);

  useEffect(() => {
    const onOutsideClick = (e: MouseEvent) => {
      if (focusDropdownRef.current && !focusDropdownRef.current.contains(e.target as Node)) {
        setIsFocusOpen(false);
      }
    };
    if (isFocusOpen) document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [isFocusOpen]);

  // ── Event Handlers ────────────────────────────────────────────────────────

  const handleSearch = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    triggerSearch(searchTerm, startDate, endDate, activeFilter, collapsedProjects, focusProject);
  };

  const handleDateSelect = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    triggerSearch(searchTerm, start, end, activeFilter, collapsedProjects, focusProject);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setActiveFilter(null);
    setActiveTrail(null);
    setCollapsedProjects(new Set());
    setFocusProject(null);
    // Initial fetch is handled by useEffect due to state changes
  };

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ backgroundColor: "var(--nexus-bg)", color: "var(--nexus-text)" }}
    >
      <div
        className="flex flex-col h-full w-full animate-fade-in overflow-hidden relative"
        style={{ backgroundColor: "var(--nexus-bg)" }}
      >
        <div className="p-3 shrink-0 flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onSearch={handleSearch}
              loading={isLoading}
            />
          </div>
          {allProjectIds.length > 0 && (
            <div ref={focusDropdownRef} className="relative shrink-0">
              <IconButton
                onClick={() => setIsFocusOpen((o) => !o)}
                inactiveClassName="hover:bg-nexus-border"
                tooltip={focusProject ? `Focus: ${focusProject}` : "Focus Mode"}
                className="flex items-center justify-center w-9.5 h-9.5 rounded-md"
              >
                <Crosshair
                  size={16}
                  className={`transition-colors ${focusProject ? "text-nexus-accent" : "text-nexus-text-muted"}`}
                />
              </IconButton>
              {isFocusOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-nexus-border bg-nexus-bg shadow-lg z-50 overflow-hidden">
                  {["", ...allProjectIds].map((p) => (
                    <button
                      key={p || "__all__"}
                      onClick={() => {
                        handleFocusProject(p || null);
                        setIsFocusOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        (focusProject ?? "") === p
                          ? "bg-nexus-accent/20 text-nexus-accent"
                          : "text-nexus-text hover:bg-nexus-border"
                      }`}
                    >
                      {p || "All projects"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden px-3">
          {error && (
            <div className="absolute top-0 left-3 right-3 z-50 bg-(--vscode-inputValidation-errorBackground,rgba(100,0,0,0.85)) border border-(--vscode-inputValidation-errorBorder,#be1100) text-nexus-text-bright p-2 rounded text-xs animate-fade-in shadow-md">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div
            ref={graphContainerRef}
            onContextMenu={(e) => e.preventDefault()}
            className="flex-1 min-h-0 relative rounded-md border border-nexus-border overflow-hidden bg-nexus-sidebar/10"
          >
            {filterPanelSide !== "none" && (
              <FilterPanel
                side={filterPanelSide}
                activeFilter={activeFilter}
                onFilterSelect={setActiveFilter}
              />
            )}
            {graphData.nodes.length > 0 && graphSize.width > 0 ? (
              <NetworkGraph
                data={graphData}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNode?.id ?? null}
                onNodeRightClick={(node) => {
                  if (node.details.type === OBSERVATION_TYPES.PROJECT && node.details.project) {
                    toggleProjectCollapse(node.details.project);
                  }
                }}
                width={graphSize.width}
                height={graphSize.height}
                isFloating={isFloating}
                floatCorner={floatCorner}
                nodeColors={nodeColors}
              />
            ) : (
              !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-nexus-text-muted space-y-2 opacity-50">
                  <Globe size={32} />
                  <p className="text-sm">No memories found...</p>
                </div>
              )
            )}
          </div>

          <div
            className={[
              "border border-nexus-border rounded-md transition-all duration-300",
              isFloating
                ? `absolute bottom-0 ${floatCorner === "right" ? "right-3" : "left-3"} z-40 w-64 shadow-lg`
                : "flex flex-col shrink-0 mt-3 mb-3 h-auto",
            ].join(" ")}
            style={{ backgroundColor: "var(--nexus-bg)" }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-nexus-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <IconButton
                  onClick={() => setShowCalendar(!showCalendar)}
                  active={showCalendar}
                  tooltip="Toggle calendar"
                  tooltipPosition="top-left"
                >
                  <CalendarIcon size={16} />
                </IconButton>
                <IconButton
                  onClick={toggleTheme}
                  tooltip="Toggle theme"
                  tooltipPosition="top-left"
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </IconButton>
                {allProjectIds.length > 0 && (
                  <IconButton
                    onClick={toggleAllProjects}
                    active={allCollapsed}
                    activeClassName="text-nexus-accent hover:bg-nexus-border"
                    tooltip={allCollapsed ? "Expand all projects" : "Collapse all projects"}
                    tooltipPosition="top-left"
                  >
                    {allCollapsed ? <FolderOpen size={16} /> : <Folder size={16} />}
                  </IconButton>
                )}
                {isFloating && (
                  <IconButton
                    onClick={toggleCorner}
                    tooltip={floatCorner === "right" ? "Move to left" : "Move to right"}
                    tooltipPosition="top-left"
                  >
                    {floatCorner === "right" ? <PanelLeft size={16} /> : <PanelRight size={16} />}
                  </IconButton>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(searchTerm ||
                  startDate ||
                  activeFilter ||
                  focusProject ||
                  collapsedProjects.size > 0) && (
                  <IconButton
                    onClick={resetFilters}
                    tooltip="Clear Filters"
                    tooltipPosition="top-right"
                  >
                    <FilterX size={16} />
                  </IconButton>
                )}
              </div>
            </div>

            {showCalendar && (
              <div className="p-2 animate-slide-up">
                <Calendar
                  selectedDate={startDate}
                  onDateSelect={handleDateSelect}
                  className="w-full border-none bg-transparent shadow-none"
                />
              </div>
            )}
          </div>

          {activeTrail ? (
            <TimelineView
              trail={activeTrail}
              observations={trailObservations}
              onClose={() => {
                setActiveTrail(null);
                clearTrail();
              }}
            />
          ) : selectedNode ? (
            <NodeDetails
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onShowTrail={(topicKey, sessionId) => {
                const trail = { topicKey, sessionId };
                setActiveTrail(trail);
                fetchTrail(trail);
                setSelectedNode(null);
              }}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
