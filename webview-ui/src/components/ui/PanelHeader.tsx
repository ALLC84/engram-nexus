import React from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface PanelHeaderProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ onClose, children, className }) => {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-nexus-border bg-nexus-bg shrink-0 ${className ?? ""}`}
    >
      {children}
      <IconButton
        onClick={onClose}
        size="sm"
        inactiveClassName="text-nexus-text-muted hover:bg-nexus-border hover:text-nexus-text-bright"
      >
        <X size={16} />
      </IconButton>
    </div>
  );
};
