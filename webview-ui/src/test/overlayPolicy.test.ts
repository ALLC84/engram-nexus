import { describe, expect, it } from "vitest";
import { resolveOverlayPolicy } from "../hooks/overlayPolicy";
import { VIEW_MODES } from "../constants/types";

describe("resolveOverlayPolicy", () => {
  it("forces filter panel to top in list mode", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.LIST,
      isFloating: false,
      floatCorner: "right",
      filterPanelSide: "left",
      sentinelPanelSide: "none",
      isSentinelPanelOpen: false,
      showCalendar: false,
    });

    expect(policy.effectiveFilterPanelSide).toBe("top");
  });

  it("docks center button when bottom-right sentinel is open and button is on right side", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: false,
      floatCorner: "left",
      filterPanelSide: "top",
      sentinelPanelSide: "bottom-right",
      isSentinelPanelOpen: true,
      showCalendar: true,
    });

    expect(policy.shouldDockCenterButton).toBe(true);
  });

  it("reports sentinel features disabled when sentinel side is none", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: true,
      floatCorner: "right",
      filterPanelSide: "top",
      sentinelPanelSide: "none",
      isSentinelPanelOpen: true,
      showCalendar: false,
    });

    expect(policy.showSentinelFeatures).toBe(false);
    expect(policy.shouldForceCloseSentinelPanel).toBe(true);
  });

  it("uses floating-open lane offsets when calendar is open and floating", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: true,
      floatCorner: "right",
      filterPanelSide: "bottom",
      sentinelPanelSide: "bottom-right",
      isSentinelPanelOpen: true,
      showCalendar: true,
    });

    expect(policy.filterPanelClassName).toBe("bottom-92");
    expect(policy.sentinelPanelClassName).toBe("right-6 bottom-109");
  });

  it("uses floating-closed lane offsets when calendar is closed and floating", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: true,
      floatCorner: "right",
      filterPanelSide: "bottom",
      sentinelPanelSide: "bottom-right",
      isSentinelPanelOpen: true,
      showCalendar: false,
    });

    expect(policy.filterPanelClassName).toBe("bottom-14");
    expect(policy.sentinelPanelClassName).toBe("right-6 bottom-31");
  });

  it("pushes sentinel above filter when both are bottom and calendar is docked open", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: false,
      floatCorner: "left",
      filterPanelSide: "bottom",
      sentinelPanelSide: "bottom-right",
      isSentinelPanelOpen: true,
      showCalendar: true,
    });

    expect(policy.filterPanelClassName).toBe("bottom-3");
    expect(policy.sentinelPanelClassName).toBe("right-6 bottom-116");
  });

  it("pushes sentinel one lane above filter when both are bottom and calendar is closed", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: false,
      floatCorner: "left",
      filterPanelSide: "bottom",
      sentinelPanelSide: "bottom-right",
      isSentinelPanelOpen: true,
      showCalendar: false,
    });

    expect(policy.filterPanelClassName).toBe("bottom-3");
    expect(policy.sentinelPanelClassName).toBe("right-6 bottom-38");
  });

  it("uses sentinel-only bottom lane when filter is not bottom", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: false,
      floatCorner: "left",
      filterPanelSide: "top",
      sentinelPanelSide: "bottom-right",
      isSentinelPanelOpen: true,
      showCalendar: false,
    });

    expect(policy.sentinelPanelClassName).toBe("right-6 bottom-21");
  });

  it("pushes top sentinel below top filter lane", () => {
    const policy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: false,
      floatCorner: "left",
      filterPanelSide: "top",
      sentinelPanelSide: "top-right",
      isSentinelPanelOpen: true,
      showCalendar: false,
    });

    expect(policy.sentinelPanelClassName).toBe("top-20");
  });

  it("uses detail panel bottom token based on calendar visibility", () => {
    const openPolicy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: false,
      floatCorner: "left",
      filterPanelSide: "top",
      sentinelPanelSide: "none",
      isSentinelPanelOpen: false,
      showCalendar: true,
    });

    const closedPolicy = resolveOverlayPolicy({
      viewMode: VIEW_MODES.GRAPH,
      isFloating: false,
      floatCorner: "left",
      filterPanelSide: "top",
      sentinelPanelSide: "none",
      isSentinelPanelOpen: false,
      showCalendar: false,
    });

    expect(openPolicy.detailPanelBottomOffsetClass).toBe("bottom-96");
    expect(closedPolicy.detailPanelBottomOffsetClass).toBe("bottom-18");
  });
});
