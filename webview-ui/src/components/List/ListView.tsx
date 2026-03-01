import React from "react";
import { List } from "lucide-react";
import { TimelineItem } from "../ui/TimelineItem";
import { OBSERVATION_TYPES } from "../../constants/types";
import type { EngramNode } from "../../types/graph.d";

const STRUCTURAL_TYPES = new Set<string>([OBSERVATION_TYPES.PROJECT, OBSERVATION_TYPES.SYSTEM]);

interface ListViewProps {
  nodes: EngramNode[];
  onProjectClick: (project: string) => void;
  filterPanelSide?: string;
}

export const ListView: React.FC<ListViewProps> = ({ nodes, onProjectClick, filterPanelSide }) => {
  const items = nodes
    .filter((n) => !STRUCTURAL_TYPES.has(n.details.type))
    .sort(
      (a, b) => new Date(b.details.created_at).getTime() - new Date(a.details.created_at).getTime()
    );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-nexus-text-muted space-y-2 opacity-50">
        <List size={32} />
        <p className="text-sm">No memories found...</p>
      </div>
    );
  }

  const panelOffset =
    filterPanelSide === "top" ? "pt-20" : filterPanelSide === "bottom" ? "pb-20" : "";

  return (
    <div className={`h-full overflow-y-auto p-4 space-y-3 ${panelOffset}`}>
      {items.map((node, index) => (
        <TimelineItem
          key={node.id ?? index}
          obs={node.details}
          isLast={index === items.length - 1}
          onProjectClick={onProjectClick}
        />
      ))}
    </div>
  );
};
