import { useCallback, useEffect, useRef, useState } from "react";
import {
  SENTINEL_EVENT_TYPES,
  type SentinelEventType,
  type SentinelTelemetryEvent,
} from "../types/sentinel";

const SENTINEL_SSE_URLS = ["http://127.0.0.1:7438/events", "http://localhost:7438/events"];
const MAX_BUFFER_SIZE = 10;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

const NAMED_EVENT_TYPES: Array<{ eventName: string; fallbackType: SentinelEventType }> = [
  { eventName: "INVOCATION", fallbackType: SENTINEL_EVENT_TYPES.INVOCATION },
  { eventName: "BLOCK", fallbackType: SENTINEL_EVENT_TYPES.BLOCK },
  { eventName: "invocation", fallbackType: SENTINEL_EVENT_TYPES.INVOCATION },
  { eventName: "block", fallbackType: SENTINEL_EVENT_TYPES.BLOCK },
];

const nonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parsePayload = (data: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
    return { message: String(parsed) };
  } catch {
    return { message: data };
  }
};

const resolveType = (
  payload: Record<string, unknown>,
  fallbackType?: SentinelEventType
): SentinelEventType => {
  const rawType =
    nonEmptyString(payload.type) ??
    nonEmptyString(payload.eventType) ??
    nonEmptyString(payload.event) ??
    fallbackType;

  if (!rawType) return SENTINEL_EVENT_TYPES.UNKNOWN;

  const normalized = rawType.toUpperCase();
  if (normalized === SENTINEL_EVENT_TYPES.INVOCATION) return SENTINEL_EVENT_TYPES.INVOCATION;
  if (normalized === SENTINEL_EVENT_TYPES.BLOCK) return SENTINEL_EVENT_TYPES.BLOCK;
  return SENTINEL_EVENT_TYPES.UNKNOWN;
};

const resolveSummary = (payload: Record<string, unknown>): string => {
  const method = nonEmptyString(payload.method);
  const path = nonEmptyString(payload.path) ?? nonEmptyString(payload.route);
  if (method && path) return `${method} ${path}`;

  return (
    nonEmptyString(payload.toolName) ??
    nonEmptyString(payload.tool_name) ??
    nonEmptyString(payload.tool) ??
    nonEmptyString(payload.command) ??
    nonEmptyString(payload.action) ??
    nonEmptyString(payload.message) ??
    "telemetry event"
  );
};

const resolveTimestamp = (payload: Record<string, unknown>): string => {
  return (
    nonEmptyString(payload.timestamp) ??
    nonEmptyString(payload.time) ??
    nonEmptyString(payload.created_at) ??
    new Date().toISOString()
  );
};

const resolveReason = (payload: Record<string, unknown>): string | undefined => {
  return (
    nonEmptyString(payload.reason) ??
    nonEmptyString(payload.blockReason) ??
    nonEmptyString(payload.block_reason)
  );
};

const resolveTool = (payload: Record<string, unknown>): string | undefined => {
  return (
    nonEmptyString(payload.tool) ??
    nonEmptyString(payload.toolName) ??
    nonEmptyString(payload.tool_name) ??
    nonEmptyString(payload.targetTool) ??
    nonEmptyString(payload.target_tool)
  );
};

const createTelemetryEvent = (
  payload: Record<string, unknown>,
  fallbackType?: SentinelEventType
): SentinelTelemetryEvent => {
  const timestamp = resolveTimestamp(payload);
  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    type: resolveType(payload, fallbackType),
    timestamp,
    summary: resolveSummary(payload),
    tool: resolveTool(payload),
    reason: resolveReason(payload),
    raw: payload,
  };
};

export function useSentinelTelemetry(urls: string[] = SENTINEL_SSE_URLS) {
  const endpointsKey = urls
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join("|");
  const [events, setEvents] = useState<SentinelTelemetryEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const endpointIndexRef = useRef(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const pushEvent = useCallback((event: SentinelTelemetryEvent) => {
    setEvents((prev) => {
      const next = [...prev, event];
      return next.length > MAX_BUFFER_SIZE ? next.slice(-MAX_BUFFER_SIZE) : next;
    });
  }, []);

  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;
    const endpoints = endpointsKey.split("|").filter((value) => value.length > 0);
    if (endpoints.length === 0) return undefined;

    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      const endpoint = endpoints[endpointIndexRef.current % endpoints.length] ?? endpoints[0];
      if (!endpoint) return;
      const source = new EventSource(endpoint);
      sourceRef.current = source;

      const handleEvent = (event: MessageEvent<string>, fallbackType?: SentinelEventType) => {
        if (!isMounted) return;
        const payload = parsePayload(event.data);
        const telemetryEvent = createTelemetryEvent(payload, fallbackType);
        pushEvent(telemetryEvent);
      };

      source.onopen = () => {
        if (!isMounted) return;
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        clearReconnectTimer();
      };

      source.onmessage = (event) => {
        handleEvent(event);
      };

      NAMED_EVENT_TYPES.forEach(({ eventName, fallbackType }) => {
        source.addEventListener(eventName, (event) => {
          handleEvent(event as MessageEvent<string>, fallbackType);
        });
      });

      source.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
        source.close();
        if (sourceRef.current === source) {
          sourceRef.current = null;
        }

        clearReconnectTimer();
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
          RECONNECT_MAX_MS
        );
        reconnectAttemptRef.current += 1;
        endpointIndexRef.current = (endpointIndexRef.current + 1) % endpoints.length;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      isMounted = false;
      setIsConnected(false);
      clearReconnectTimer();
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [clearReconnectTimer, endpointsKey, pushEvent]);

  return {
    events,
    latestEvent: events.length > 0 ? events[events.length - 1] : null,
    isConnected,
  };
}
