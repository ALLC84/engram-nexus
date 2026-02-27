import React from "react";
import { CornerDownRight } from "lucide-react";
import type { ObservationDetails } from "../../types/graph.d";

interface TimelineItemProps {
  obs: ObservationDetails;
  isLast: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ obs, isLast }) => {
  return (
    <div className="relative pl-6">
      {!isLast && (
        <div className="absolute left-2 top-6 bottom-[-24px] w-[2px] bg-nexus-border/50"></div>
      )}
      <div className="absolute left-[3px] top-1.5 w-[10px] h-[10px] rounded-full bg-nexus-accent border-2 border-nexus-sidebar z-10"></div>

      <div className="bg-nexus-bg/50 border border-nexus-border/50 rounded-md p-3 group hover:border-nexus-accent/50 transition-colors">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-nexus-accent bg-nexus-accent/10 px-1.5 py-0.5 rounded">
            {obs.type}
          </span>
          <span className="text-[10px] text-nexus-text-muted">
            {new Date(obs.created_at).toLocaleDateString()}
          </span>
        </div>
        <h4 className="text-xs font-bold text-nexus-text-bright mb-2 leading-tight">
          {obs.title}
        </h4>
        <div className="relative">
          <CornerDownRight size={12} className="absolute -left-1 text-nexus-text-muted/50 top-0.5" />
          <p className="text-[11px] text-nexus-text leading-relaxed pl-3 line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
            {obs.content}
          </p>
        </div>
      </div>
    </div>
  );
};
