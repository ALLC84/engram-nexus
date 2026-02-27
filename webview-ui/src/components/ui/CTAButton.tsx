import React from "react";

interface CTAButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  title?: string;
}

const variantClasses: Record<NonNullable<CTAButtonProps["variant"]>, string> = {
  primary:
    "bg-nexus-accent hover:bg-nexus-accent/90 focus:ring-2 focus:ring-nexus-accent/40 text-(--vscode-button-foreground,#ffffff) border-transparent",
  secondary:
    "bg-nexus-bg hover:bg-nexus-border focus:ring-2 focus:ring-nexus-border text-nexus-text-bright border-nexus-border",
};

export const CTAButton: React.FC<CTAButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  title,
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded transition-all shadow-sm active:scale-[0.98] font-medium text-xs border ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};
