import {
  VIEW_MODES,
  type FilterPanelSide,
  type FloatCorner,
  type SentinelPanelSide,
  type ViewMode,
} from "../constants/types";
import {
  BOTTOM_LANES,
  DETAIL_PANEL_BOTTOM_OFFSETS,
  TOP_LANES,
  type BottomLayoutMode,
} from "../constants/overlayLayout";

export interface OverlayPolicyInput {
  viewMode: ViewMode;
  isFloating: boolean;
  floatCorner: FloatCorner;
  filterPanelSide: FilterPanelSide;
  sentinelPanelSide: SentinelPanelSide;
  isSentinelPanelOpen: boolean;
  showCalendar: boolean;
}

export interface OverlayPolicyOutput {
  detailPanelBottomOffsetClass: string;
  effectiveFilterPanelSide: FilterPanelSide;
  showSentinelFeatures: boolean;
  shouldForceCloseSentinelPanel: boolean;
  shouldDockCenterButton: boolean;
  filterPanelClassName?: string;
  sentinelPanelClassName?: string;
}

function resolveBottomLayoutMode(showCalendar: boolean, isFloating: boolean): BottomLayoutMode {
  if (isFloating) return showCalendar ? "floating-open" : "floating-closed";
  return showCalendar ? "docked-open" : "docked-closed";
}

export function resolveOverlayPolicy(input: OverlayPolicyInput): OverlayPolicyOutput {
  const {
    viewMode,
    isFloating,
    floatCorner,
    filterPanelSide,
    sentinelPanelSide,
    isSentinelPanelOpen,
    showCalendar,
  } = input;

  const effectiveFilterPanelSide =
    viewMode === VIEW_MODES.LIST && filterPanelSide !== "none" ? "top" : filterPanelSide;
  const detailPanelBottomOffsetClass = showCalendar
    ? DETAIL_PANEL_BOTTOM_OFFSETS.calendarOpen
    : DETAIL_PANEL_BOTTOM_OFFSETS.calendarClosed;
  const isCenterButtonOnLeft = isFloating && floatCorner === "right";

  const isSentinelBlockingLeft =
    sentinelPanelSide === "bottom-left" && isSentinelPanelOpen && viewMode === VIEW_MODES.GRAPH;
  const isSentinelBlockingRight =
    sentinelPanelSide === "bottom-right" && isSentinelPanelOpen && viewMode === VIEW_MODES.GRAPH;
  const isFilterBlockingBottom = effectiveFilterPanelSide === "bottom";
  const isFilterBlockingLeft = effectiveFilterPanelSide === "left";
  const isFilterBlockingRight = effectiveFilterPanelSide === "right";

  const shouldDockCenterButton =
    viewMode !== VIEW_MODES.GRAPH ||
    (isCenterButtonOnLeft
      ? isSentinelBlockingLeft || isFilterBlockingLeft || isFilterBlockingBottom
      : isSentinelBlockingRight || isFilterBlockingRight || isFilterBlockingBottom);

  const isSentinelTop = sentinelPanelSide === "top-left" || sentinelPanelSide === "top-right";
  const isSentinelBottom =
    sentinelPanelSide === "bottom-left" || sentinelPanelSide === "bottom-right";
  const showSentinelFeatures = sentinelPanelSide !== "none";
  const isSentinelVisibleInGraph = showSentinelFeatures && isSentinelPanelOpen;
  const isBottomFilter = effectiveFilterPanelSide === "bottom";
  const hasBottomLaneCollision = isBottomFilter && isSentinelVisibleInGraph && isSentinelBottom;
  const bottomLayoutMode = resolveBottomLayoutMode(showCalendar, isFloating);

  // Lane policy:
  // - Top: Filter goes first (closest to top), Sentinel goes below when both are top.
  // - Bottom: Filter goes last (closest to bottom), Sentinel goes above when both are bottom.
  const filterPanelClassName = isBottomFilter ? BOTTOM_LANES[bottomLayoutMode].filter : undefined;

  const sentinelPanelClassName =
    isSentinelVisibleInGraph && isSentinelTop && effectiveFilterPanelSide === "top"
      ? TOP_LANES.sentinelWithTopFilter
      : isSentinelVisibleInGraph && isSentinelBottom
        ? `${sentinelPanelSide === "bottom-left" ? "left-6" : "right-6"} ${
            hasBottomLaneCollision
              ? BOTTOM_LANES[bottomLayoutMode].sentinelWithFilter
              : BOTTOM_LANES[bottomLayoutMode].sentinelOnly
          }`
        : undefined;

  return {
    detailPanelBottomOffsetClass,
    effectiveFilterPanelSide,
    showSentinelFeatures,
    shouldForceCloseSentinelPanel: sentinelPanelSide === "none",
    shouldDockCenterButton,
    filterPanelClassName,
    sentinelPanelClassName,
  };
}
