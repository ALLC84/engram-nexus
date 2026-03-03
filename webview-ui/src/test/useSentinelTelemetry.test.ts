import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SENTINEL_EVENT_TYPES } from "../types/sentinel";
import { useSentinelTelemetry } from "../hooks/useSentinelTelemetry";

type MockListener = (event: MessageEvent<string>) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  static clear() {
    MockEventSource.instances = [];
  }

  readonly url: string;
  readonly withCredentials = false;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;
  readyState = 1;
  onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent<string>) => unknown) | null = null;
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;
  private listeners = new Map<string, MockListener[]>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: MockListener): void {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  removeEventListener(type: string, listener: MockListener): void {
    const current = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      current.filter((candidate) => candidate !== listener)
    );
  }

  close(): void {
    this.readyState = this.CLOSED;
  }

  emitOpen() {
    this.onopen?.call(this as unknown as EventSource, new Event("open"));
  }

  emitMessage(data: string) {
    this.onmessage?.call(
      this as unknown as EventSource,
      new MessageEvent("message", { data }) as MessageEvent<string>
    );
  }

  emitNamedMessage(type: string, data: string) {
    const event = new MessageEvent(type, { data }) as MessageEvent<string>;
    (this.listeners.get(type) ?? []).forEach((listener) => listener(event));
  }

  emitError() {
    this.onerror?.call(this as unknown as EventSource, new Event("error"));
  }
}

beforeEach(() => {
  vi.stubGlobal("EventSource", MockEventSource);
  MockEventSource.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useSentinelTelemetry", () => {
  it("reads INVOCATION/BLOCK SSE events and exposes latestEvent", () => {
    const { result } = renderHook(() => useSentinelTelemetry(["http://localhost:7438/events"]));
    const source = MockEventSource.instances[0];

    act(() => {
      source.emitOpen();
      source.emitMessage(JSON.stringify({ type: "INVOCATION", tool: "search_memory" }));
      source.emitNamedMessage("BLOCK", JSON.stringify({ method: "POST", path: "/chat", reason: "prompt injection" }));
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0]?.type).toBe(SENTINEL_EVENT_TYPES.INVOCATION);
    expect(result.current.events[1]?.type).toBe(SENTINEL_EVENT_TYPES.BLOCK);
    expect(result.current.events[1]?.reason).toBe("prompt injection");
    expect(result.current.latestEvent?.type).toBe(SENTINEL_EVENT_TYPES.BLOCK);
  });

  it("keeps a bounded circular buffer (latest 10 events)", () => {
    const { result } = renderHook(() => useSentinelTelemetry(["http://localhost:7438/events"]));
    const source = MockEventSource.instances[0];

    act(() => {
      for (let index = 0; index < 12; index += 1) {
        source.emitMessage(JSON.stringify({ type: "INVOCATION", message: `event-${index}` }));
      }
    });

    expect(result.current.events).toHaveLength(10);
    expect(result.current.events[0]?.summary).toBe("event-2");
    expect(result.current.events[9]?.summary).toBe("event-11");
  });

  it("reconnects automatically after backend error", () => {
    vi.useFakeTimers();
    renderHook(() => useSentinelTelemetry(["http://localhost:7438/events"]));
    const firstSource = MockEventSource.instances[0];

    act(() => {
      firstSource.emitError();
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });
});
