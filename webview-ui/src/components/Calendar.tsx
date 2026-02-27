import React, { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  eachDayOfInterval,
  isToday,
} from "date-fns";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "./ui/IconButton";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarProps {
  onDateSelect: (start: string, end: string) => void;
  selectedDate?: string;
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ onDateSelect, selectedDate, className }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-2 py-3 border-b border-nexus-border/50">
        <div className="flex flex-col">
          <span className="text-sm font-semibold capitalize text-nexus-text-bright">
            {format(currentMonth, "MMMM yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2 py-1 text-[10px] uppercase font-bold text-nexus-text-muted hover:text-nexus-text-bright transition-colors"
          >
            today
          </button>
          <IconButton
            onClick={prevMonth}
            size="sm"
            inactiveClassName="text-nexus-text-muted hover:bg-nexus-border/50 hover:text-nexus-text-bright"
          >
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton
            onClick={nextMonth}
            size="sm"
            inactiveClassName="text-nexus-text-muted hover:bg-nexus-border/50 hover:text-nexus-text-bright"
          >
            <ChevronRight size={16} />
          </IconButton>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    return (
      <div className="grid grid-cols-7 mb-1">
        {days.map((day, i) => (
          <div
            key={i}
            className="text-center py-2 text-[10px] font-bold text-nexus-text-muted uppercase tracking-tighter"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const rows: React.ReactNode[] = [];
    let days: React.ReactNode[] = [];

    calendarDays.forEach((day, i) => {
      const formattedDate = format(day, "yyyy-MM-dd");
      const isSelected = selectedDate === formattedDate;
      const isCurrentMonth = isSameMonth(day, monthStart);

      days.push(
        <div
          key={day.toString()}
          className={cn(
            "relative h-8 flex items-center justify-center cursor-pointer transition-all group",
            !isCurrentMonth && "text-nexus-text-muted/30",
            isCurrentMonth && "text-nexus-text",
            isSelected && "bg-nexus-accent/20 rounded-sm"
          )}
          onClick={() => {
            // Set range: the whole selected day
            onDateSelect(formattedDate, formattedDate);
          }}
        >
          <span
            className={cn(
              "relative z-10 text-xs",
              isSelected && "text-nexus-accent font-bold",
              isToday(day) &&
                !isSelected &&
                "text-nexus-text-bright underline decoration-nexus-accent underline-offset-4"
            )}
          >
            {format(day, "d")}
          </span>
          {isSelected && (
            <div className="absolute inset-0 border border-nexus-accent/50 rounded-sm" />
          )}
          <div className="absolute inset-0 bg-nexus-text-bright/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
        </div>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(
          <div className="grid grid-cols-7" key={day.toString()}>
            {days}
          </div>
        );
        days = [];
      }
    });

    return <div className="p-1">{rows}</div>;
  };

  return (
    <div className={cn("bg-transparent overflow-hidden", className)}>
      {renderHeader()}
      <div className="p-1 mt-1">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
};
