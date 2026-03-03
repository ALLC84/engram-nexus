import { useMemo } from "react";
import type { OverlayPolicyInput } from "./overlayPolicy";
import { resolveOverlayPolicy } from "./overlayPolicy";

export function useOverlayLayout({
  viewMode,
  isFloating,
  floatCorner,
  filterPanelSide,
  sentinelPanelSide,
  isSentinelPanelOpen,
  showCalendar,
}: OverlayPolicyInput) {
  return useMemo(
    () =>
      resolveOverlayPolicy({
        viewMode,
        isFloating,
        floatCorner,
        filterPanelSide,
        sentinelPanelSide,
        isSentinelPanelOpen,
        showCalendar,
      }),
    [
      filterPanelSide,
      floatCorner,
      isFloating,
      isSentinelPanelOpen,
      sentinelPanelSide,
      showCalendar,
      viewMode,
    ]
  );
}
