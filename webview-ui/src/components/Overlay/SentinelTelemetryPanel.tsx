import type { FC } from "react";
import { SENTINEL_EVENT_TYPES, type SentinelTelemetryEvent } from "../../types/sentinel";
import type { SentinelPanelSide } from "../../constants/types";

interface SentinelTelemetryPanelProps {
  events: SentinelTelemetryEvent[];
  isConnected: boolean;
  side: SentinelPanelSide;
  className?: string;
}

const sideToPositionClasses: Record<Exclude<SentinelPanelSide, "none">, string> = {
  "top-left": "left-6 top-3",
  "top-right": "right-6 top-3",
  "bottom-left": "left-6",
  "bottom-right": "right-6",
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString("en-GB", { hour12: false });
};

const getEventClassName = (type: SentinelTelemetryEvent["type"]): string => {
  if (type === SENTINEL_EVENT_TYPES.BLOCK) return "text-red-300 border-red-400/20";
  if (type === SENTINEL_EVENT_TYPES.INVOCATION) return "text-emerald-300 border-emerald-400/20";
  return "text-nexus-text-muted border-nexus-border/20";
};

export const SentinelTelemetryPanel: FC<SentinelTelemetryPanelProps> = ({
  events,
  isConnected,
  side,
  className,
}) => {
  if (side === "none") return null;
  const basePosition = sideToPositionClasses[side];

  return (
    <aside
      className={`absolute z-80 w-80 max-h-72 pointer-events-none ${basePosition} ${className ?? ""}`}
    >
      <div className="h-full rounded-md border border-emerald-500/40 bg-black/80 shadow-xl backdrop-blur-sm pointer-events-auto overflow-hidden">
        <header className="flex items-center justify-between px-3 py-2 border-b border-emerald-500/30 font-mono text-[10px] uppercase tracking-widest text-emerald-300">
          <span>Sentinel Live Feed</span>
          <span
            className={`inline-flex items-center gap-1 ${isConnected ? "text-emerald-400" : "text-amber-300"}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-300"}`}
            />
            {isConnected ? "LIVE" : "RECONNECTING"}
          </span>
        </header>

        <ul className="max-h-60 overflow-y-auto px-2 py-2 space-y-1 font-mono text-[11px]">
          {[...events].reverse().map((event) => (
            <li
              key={event.id}
              className={`border rounded px-2 py-1 leading-tight ${getEventClassName(event.type)}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-nexus-text-muted">
                  {formatTimestamp(event.timestamp)}
                </span>
                <span className="font-semibold">{event.type}</span>
              </div>
              <div className="truncate">{event.summary}</div>
              {event.type === SENTINEL_EVENT_TYPES.BLOCK && event.reason && (
                <div className="text-[10px] text-red-200 mt-0.5">reason: {event.reason}</div>
              )}
            </li>
          ))}

          {events.length === 0 && (
            <li className="px-2 py-1 text-[10px] text-emerald-200/70">
              waiting for telemetry events...
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
};
