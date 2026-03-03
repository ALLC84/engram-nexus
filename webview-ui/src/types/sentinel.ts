export const SENTINEL_EVENT_TYPES = {
  INVOCATION: "INVOCATION",
  BLOCK: "BLOCK",
  UNKNOWN: "UNKNOWN",
} as const;

export type SentinelEventType = (typeof SENTINEL_EVENT_TYPES)[keyof typeof SENTINEL_EVENT_TYPES];

export interface SentinelTelemetryEvent {
  id: string;
  type: SentinelEventType;
  timestamp: string;
  summary: string;
  tool?: string;
  reason?: string;
  raw: Record<string, unknown>;
}
