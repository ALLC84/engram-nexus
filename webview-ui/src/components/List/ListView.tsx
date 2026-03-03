import React from "react";
import { List } from "lucide-react";
import { TimelineItem } from "../ui/TimelineItem";
import type { ObservationDetails } from "../../types/graph.d";

interface ListViewProps {
  observations: ObservationDetails[];
  onProjectClick: (project: string) => void;
  filterPanelSide?: string;
}

export const ListView: React.FC<ListViewProps> = ({ observations, onProjectClick, filterPanelSide }) => {
  if (observations.length === 0) {
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
      {observations.map((obs, index) => (
        <TimelineItem
          key={obs.id ?? index}
          obs={obs}
          isLast={index === observations.length - 1}
          onProjectClick={onProjectClick}
        />
      ))}
    </div>
  );
};
