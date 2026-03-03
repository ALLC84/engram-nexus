import React from "react";
import { Brain, Calendar, Folder, Tag } from "lucide-react";
import { MetadataRow } from "../ui/MetadataRow";
import { CTAButton } from "../ui/CTAButton";
import { PanelHeader } from "../ui/PanelHeader";
import { FloatingLabelBox } from "../ui/FloatingLabelBox";
import { vscode } from "../../vscode";
import { IPC_CHANNELS } from "../../constants/ipc";
import { SPECIAL_SESSION_IDS } from "../../constants/types";
import type { EngramNode } from "../../types/graph.d";

interface NodeDetailsProps {
  node: EngramNode;
  onClose: () => void;
  onShowTrail?: (topicKey?: string, sessionId?: string) => void;
  bottomOffsetClass?: string;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  onClose,
  onShowTrail,
  bottomOffsetClass = "bottom-3",
}) => {
  // A trail exists if the node has a topic_key or a non-manual session_id.
  // The backend returns an empty array if no siblings are found — no frontend scan needed.
  const hasTrail =
    !!node?.details?.topic_key ||
    (!!node?.details?.session_id && node.details.session_id !== SPECIAL_SESSION_IDS.MANUAL_SAVE);

  if (!node) return null;

  const handleInjectContext = () => {
    const obs = node.details;
    const memorizedContext = `### 🧠 Memory Context: ${obs.title}\n\n**Metadata:**\n- **Type:** ${obs.type}\n- **Project:** ${obs.project || "Unknown"}\n- **Date:** ${new Date(obs.created_at).toLocaleString()}\n\n**Content:**\n\`\`\`\n${obs.content}\n\`\`\``;
    vscode.postMessage({
      command: IPC_CHANNELS.INJECT_CONTEXT,
      payload: memorizedContext,
    });
  };

  return (
    <div
      className={`absolute top-3 ${bottomOffsetClass} right-3 w-80 z-90 bg-nexus-bg border border-nexus-border shadow-xl rounded-md animate-[slideInRight_0.3s_ease-out] flex flex-col overflow-hidden`}
    >
      <PanelHeader onClose={onClose}>
        <h3 className="text-[13px] font-bold text-nexus-text-bright truncate pr-4">
          {node.details.title}
        </h3>
      </PanelHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="grid grid-cols-1 gap-2">
          <MetadataRow
            icon={Brain}
            label="Origin:"
            value={
              node.details.scope === "personal" || !node.details.author || node.details.author.trim() === ""
                ? "👤 Tú (Local)"
                : `👥 Equipo: ${node.details.author}`
            }
            valueClassName={`truncate font-medium ${node.details.scope === "personal" || !node.details.author ? "text-nexus-text-bright" : "text-nexus-text-muted italic"}`}
          />
          <MetadataRow icon={Tag} label="Type:" value={node.details.type} />
          <MetadataRow icon={Folder} label="Proj:" value={node.details.project || "Global"} />
          <MetadataRow
            icon={Calendar}
            label="Date:"
            value={new Date(node.details.created_at).toLocaleString()}
          />
        </div>

        <div className="flex flex-col gap-2">
          <CTAButton onClick={handleInjectContext}>
            <Brain size={14} />
            <span>COPY FOR AGENT</span>
          </CTAButton>

          {onShowTrail && hasTrail && (
            <CTAButton
              onClick={() => onShowTrail(node.details.topic_key, node.details.session_id)}
              variant="secondary"
              title="Filter graph to show the chronological evolution of this session or topic"
            >
              <span>⏳ SHOW KNOWLEDGE TRAIL</span>
            </CTAButton>
          )}
        </div>

        <FloatingLabelBox
          label="Content"
          className="text-xs leading-relaxed text-nexus-text whitespace-pre-wrap wrap-break-word min-h-[150px]"
        >
          {node.details.content}
        </FloatingLabelBox>
      </div>
    </div>
  );
};
