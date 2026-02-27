import React from "react";
import { Bug, Lightbulb, Layers, Combine, FileText, GraduationCap } from "lucide-react";
import { OBSERVATION_TYPES } from "../../constants/types";
import { IconButton } from "../ui/IconButton";
import type { TooltipPosition } from "../ui/IconButton";

interface FilterPanelProps {
  side: "left" | "right" | "top" | "bottom" | "none";
  activeFilter: string | null;
  onFilterSelect: (filter: string | null) => void;
}

const filterOptions = [
  {
    id: OBSERVATION_TYPES.DECISION,
    label: "Decisions",
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    activeBorder: "border-amber-500/30",
  },
  {
    id: OBSERVATION_TYPES.ARCHITECTURE,
    label: "Architecture",
    icon: Layers,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    activeBorder: "border-blue-500/30",
  },
  {
    id: OBSERVATION_TYPES.BUGFIX,
    label: "Bugfixes",
    icon: Bug,
    color: "text-red-500",
    bg: "bg-red-500/10",
    activeBorder: "border-red-500/30",
  },
  {
    id: OBSERVATION_TYPES.PATTERN,
    label: "Patterns",
    icon: Combine,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    activeBorder: "border-purple-500/30",
  },
  {
    id: OBSERVATION_TYPES.LEARNING,
    label: "Learnings",
    icon: GraduationCap,
    color: "text-green-500",
    bg: "bg-green-500/10",
    activeBorder: "border-green-500/30",
  },
  {
    id: OBSERVATION_TYPES.SESSION_SUMMARY,
    label: "Sessions",
    icon: FileText,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    activeBorder: "border-slate-400/30",
  },
];

const sideToTooltipPosition: Record<string, TooltipPosition> = {
  left: "right",
  right: "left",
  top: "bottom-center",
  bottom: "top-center",
};

const sideToPositionClasses: Record<string, string> = {
  left: "top-1/2 -translate-y-1/2 left-3 flex-col",
  right: "top-1/2 -translate-y-1/2 right-3 flex-col",
  top: "left-1/2 -translate-x-1/2 top-3 flex-row",
  bottom: "left-1/2 -translate-x-1/2 bottom-3 flex-row",
};

export const FilterPanel: React.FC<FilterPanelProps> = ({ side, activeFilter, onFilterSelect }) => {
  if (side === "none") return null;

  const tooltipPosition = sideToTooltipPosition[side];
  const positionClasses = sideToPositionClasses[side];

  return (
    <div
      className={`absolute ${positionClasses} z-40 flex gap-2 p-2 rounded-xl border border-nexus-border/50 bg-nexus-sidebar/80 backdrop-blur-md shadow-lg`}
    >
      {filterOptions.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeFilter === opt.id;
        return (
          <IconButton
            key={opt.id}
            onClick={() => onFilterSelect(isActive ? null : opt.id)}
            active={isActive}
            activeClassName={`${opt.bg} border ${opt.activeBorder}`}
            inactiveClassName="hover:bg-nexus-border/50 border border-transparent"
            tooltip={opt.label}
            tooltipPosition={tooltipPosition}
            className="flex items-center justify-center w-10 h-10 rounded-lg duration-200"
          >
            <Icon
              size={18}
              className={`transition-colors duration-200 ${isActive ? opt.color : "text-nexus-text-muted group-hover:text-nexus-text"}`}
            />
          </IconButton>
        );
      })}
    </div>
  );
};
