import React, { useEffect, useRef, useState } from "react";
import { Bug, Lightbulb, Layers, Combine, FileText, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { OBSERVATION_TYPES } from "../../constants/types";
import { IconButton } from "../ui/IconButton";

interface FilterPanelProps {
  side: "left" | "right" | "top" | "bottom" | "none";
  activeFilter: string | null;
  onFilterSelect: (filter: string | null) => void;
  className?: string;
}

const filterOptions = [
  {
    id: OBSERVATION_TYPES.DECISION,
    label: "Decisions",
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    activeBorder: "border-amber-500/30",
  },
  {
    id: OBSERVATION_TYPES.ARCHITECTURE,
    label: "Architecture",
    icon: Layers,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    activeBorder: "border-blue-500/30",
  },
  {
    id: OBSERVATION_TYPES.BUGFIX,
    label: "Bugfixes",
    icon: Bug,
    color: "text-red-500",
    bg: "bg-red-500/10",
    activeBorder: "border-red-500/30",
  },
  {
    id: OBSERVATION_TYPES.PATTERN,
    label: "Patterns",
    icon: Combine,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    activeBorder: "border-purple-500/30",
  },
  {
    id: OBSERVATION_TYPES.LEARNING,
    label: "Learnings",
    icon: GraduationCap,
    color: "text-green-500",
    bg: "bg-green-500/10",
    activeBorder: "border-green-500/30",
  },
  {
    id: OBSERVATION_TYPES.SESSION_SUMMARY,
    label: "Sessions",
    icon: FileText,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    activeBorder: "border-slate-400/30",
  },
];

const sideToPositionClasses: Record<string, string> = {
  left: "top-1/2 -translate-y-1/2 left-3 flex-col max-h-[calc(100%-1.5rem)] overflow-y-auto",
  right: "top-1/2 -translate-y-1/2 right-3 flex-col max-h-[calc(100%-1.5rem)] overflow-y-auto",
  top: "left-1/2 -translate-x-1/2 top-3 max-w-[calc(100%-1.5rem)]",
  bottom: "left-1/2 -translate-x-1/2 bottom-3 max-w-[calc(100%-1.5rem)]",
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  side,
  activeFilter,
  onFilterSelect,
  className,
}) => {
  if (side === "none") return null;

  const positionClasses = sideToPositionClasses[side];
  const isHorizontalBar = side === "top" || side === "bottom";
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hasHorizontalOverflow = canScrollLeft || canScrollRight;

  const updateScrollAffordance = () => {
    if (!isHorizontalBar || !scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    if (!isHorizontalBar) return;
    updateScrollAffordance();
    const current = scrollRef.current;
    if (!current) return;
    const observer = new ResizeObserver(updateScrollAffordance);
    observer.observe(current);
    return () => observer.disconnect();
  }, [isHorizontalBar]);

  const handleHorizontalWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isHorizontalBar) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.currentTarget.scrollLeft += event.deltaY;
    event.preventDefault();
    updateScrollAffordance();
  };

  const scrollByStep = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const step = 140;
    scrollRef.current.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
    window.setTimeout(updateScrollAffordance, 180);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isHorizontalBar || !scrollRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = scrollRef.current.scrollLeft;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isHorizontalBar || !scrollRef.current || !isDraggingRef.current) return;
    const deltaX = event.clientX - dragStartXRef.current;
    scrollRef.current.scrollLeft = dragStartScrollLeftRef.current - deltaX;
    updateScrollAffordance();
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  return (
    <div
      className={`absolute ${positionClasses} z-40 rounded-xl border border-nexus-border/50 bg-nexus-sidebar/80 backdrop-blur-md shadow-lg ${className ?? ""}`}
    >
      {isHorizontalBar && hasHorizontalOverflow && (
        <>
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByStep("left")}
              className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-md border border-nexus-border/60 bg-nexus-bg/70 p-1 text-nexus-text-muted hover:text-nexus-text"
              aria-label="Scroll filters left"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByStep("right")}
              className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-md border border-nexus-border/60 bg-nexus-bg/70 p-1 text-nexus-text-muted hover:text-nexus-text"
              aria-label="Scroll filters right"
            >
              <ChevronRight size={14} />
            </button>
          )}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-4 rounded-l-xl bg-gradient-to-r from-nexus-sidebar/90 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-4 rounded-r-xl bg-gradient-to-l from-nexus-sidebar/90 to-transparent" />
        </>
      )}

      <div
        ref={scrollRef}
        onWheel={handleHorizontalWheel}
        onScroll={updateScrollAffordance}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative z-10 p-2 ${
          isHorizontalBar
            ? `nexus-horizontal-scroll flex flex-nowrap gap-2 ${
                hasHorizontalOverflow ? "overflow-x-auto" : "overflow-x-hidden"
              } overflow-y-hidden scroll-smooth [scrollbar-width:thin] ${
                canScrollLeft ? "pl-8" : ""
              } ${canScrollRight ? "pr-8" : ""} ${
                isDragging ? "cursor-grabbing select-none" : "cursor-grab"
              }`
            : "flex flex-col gap-2 overflow-x-hidden overflow-y-auto"
        }`}
      >
        {filterOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeFilter === opt.id;
          return (
            <IconButton
              key={opt.id}
              onClick={() => onFilterSelect(isActive ? null : opt.id)}
              active={isActive}
              activeClassName={`${opt.bg} border ${opt.activeBorder}`}
              inactiveClassName="hover:bg-nexus-border/50 border border-transparent"
              className="flex shrink-0 items-center justify-center w-10 h-10 rounded-lg duration-200"
            >
              <Icon
                size={18}
                className={`transition-colors duration-200 ${isActive ? opt.color : "text-nexus-text-muted group-hover:text-nexus-text"}`}
              />
            </IconButton>
          );
        })}
      </div>
    </div>
  );
};
