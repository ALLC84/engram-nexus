import React from "react";
import { Clock, Copy } from "lucide-react";
import { TimelineItem } from "../ui/TimelineItem";
import { CTAButton } from "../ui/CTAButton";
import { PanelHeader } from "../ui/PanelHeader";
import { vscode } from "../../vscode";
import { IPC_CHANNELS } from "../../constants/ipc";
import type { ObservationDetails } from "../../types/graph.d";

interface TimelineViewProps {
  trail: { topicKey?: string; sessionId?: string };
  /** Pre-fetched, chronologically sorted observations from the backend. */
  observations: ObservationDetails[];
  onClose: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ trail, observations, onClose }) => {
  const handleCopyTrail = () => {
    let markdown = `# Knowledge Trail\n\n**Topic Key:** ${trail.topicKey || "N/A"}\n**Session ID:** ${trail.sessionId || "N/A"}\n\n---\n\n`;

    observations.forEach((obs, index) => {
      markdown += `### ${index + 1}. ${obs.title}\n`;
      markdown += `- **Type:** ${obs.type}\n`;
      markdown += `- **Date:** ${new Date(obs.created_at).toLocaleString()}\n\n`;
      markdown += `\`\`\`markdown\n${obs.content}\n\`\`\`\n\n---\n\n`;
    });

    vscode.postMessage({ command: IPC_CHANNELS.INJECT_CONTEXT, payload: markdown });
  };

  if (observations.length === 0) return null;

  return (
    <div className="absolute inset-y-3 right-3 w-80 z-50 bg-nexus-bg border border-nexus-border shadow-xl rounded-md animate-[slideInRight_0.3s_ease-out] flex flex-col overflow-hidden">
      <PanelHeader onClose={onClose}>
        <div className="flex items-center gap-2 text-nexus-text-bright">
          <Clock size={16} className="text-nexus-accent" />
          <h3 className="text-[13px] font-bold tracking-wide uppercase">Knowledge Trail</h3>
        </div>
      </PanelHeader>

      <div className="p-3 border-b border-nexus-border/50 shrink-0 bg-nexus-bg/30">
        <CTAButton onClick={handleCopyTrail}>
          <Copy size={14} />
          <span>COPY ENTIRE TRAIL</span>
        </CTAButton>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {observations.map((obs, index) => (
          <TimelineItem
            key={obs.id}
            obs={obs}
            isLast={index === observations.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
