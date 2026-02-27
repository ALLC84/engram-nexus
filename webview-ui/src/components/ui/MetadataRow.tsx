import React from "react";
import type { LucideProps } from "lucide-react";

interface MetadataRowProps {
  icon: React.ComponentType<LucideProps>;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

export const MetadataRow: React.FC<MetadataRowProps> = ({
  icon: Icon,
  label,
  value,
  valueClassName = "text-nexus-text truncate",
}) => {
  return (
    <div className="flex items-center gap-3 text-xs text-nexus-text-muted bg-nexus-bg/50 p-2 rounded border border-nexus-border/50">
      <Icon size={12} className="text-nexus-accent shrink-0" />
      <span className="font-semibold uppercase text-[10px] w-12 shrink-0">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
};
