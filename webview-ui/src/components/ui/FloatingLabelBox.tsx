import React from "react";

interface FloatingLabelBoxProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const FloatingLabelBox: React.FC<FloatingLabelBoxProps> = ({
  label,
  children,
  className,
}) => {
  return (
    <div className="group relative mt-2">
      <div className="absolute -top-2 left-2 px-1 bg-nexus-bg text-[10px] font-semibold text-nexus-accent uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`w-full bg-nexus-bg/30 border border-nexus-border rounded p-3 pt-4 ${className ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
};
