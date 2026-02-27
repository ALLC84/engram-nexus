import React from "react";

export type TooltipPosition =
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "top-right"
  | "top-left"
  | "top-center"
  | "right"
  | "left";

interface IconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  tooltip?: string;
  tooltipPosition?: TooltipPosition;
  active?: boolean;
  activeClassName?: string;
  inactiveClassName?: string;
  className?: string;
  size?: "sm" | "md" | "none";
  rounded?: "sm" | "md" | "lg" | "full";
}

const tooltipPositionClasses: Record<TooltipPosition, string> = {
  "bottom-right": "right-0 top-full mt-1",
  "bottom-left": "left-0 top-full mt-1",
  "bottom-center": "left-1/2 -translate-x-1/2 top-full mt-1",
  "top-right": "right-0 bottom-full mb-1",
  "top-left": "left-0 bottom-full mb-1",
  "top-center": "left-1/2 -translate-x-1/2 bottom-full mb-1",
  right: "top-1/2 -translate-y-1/2 left-full ml-2",
  left: "top-1/2 -translate-y-1/2 right-full mr-2",
};

const roundedClasses: Record<NonNullable<IconButtonProps["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  children,
  tooltip,
  tooltipPosition = "bottom-right",
  active = false,
  activeClassName = "bg-nexus-accent text-(--vscode-button-foreground,#ffffff) shadow-sm",
  inactiveClassName,
  className,
  size = "md",
  rounded = "md",
}) => {
  const sizeClass = size === "sm" ? "p-1" : size === "none" ? "" : "p-1.5";
  const roundedClass = roundedClasses[rounded];
  const stateClass = active
    ? activeClassName
    : (inactiveClassName ?? "text-nexus-text-muted hover:bg-nexus-border hover:text-nexus-text");

  return (
    <button
      onClick={onClick}
      className={`group relative ${sizeClass} ${roundedClass} transition-all ${stateClass} ${className ?? ""}`}
    >
      {children}
      {tooltip && (
        <span
          className={`absolute ${tooltipPositionClasses[tooltipPosition]} px-2 py-1 bg-nexus-bg border border-nexus-border text-nexus-text text-[10px] font-bold uppercase tracking-wider rounded shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50`}
        >
          {tooltip}
        </span>
      )}
    </button>
  );
};
