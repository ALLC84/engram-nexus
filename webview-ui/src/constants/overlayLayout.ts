export type BottomLayoutMode =
  | "floating-open"
  | "floating-closed"
  | "docked-open"
  | "docked-closed";

export const BOTTOM_LANES: Record<
  BottomLayoutMode,
  { filter: string; sentinelOnly: string; sentinelWithFilter: string }
> = {
  "floating-open": {
    // Floating calendar opened: reserve extra gap for bottom overlays.
    filter: "bottom-92",
    sentinelOnly: "bottom-92",
    sentinelWithFilter: "bottom-109",
  },
  "floating-closed": {
    // Floating calendar closed: keep overlays lower.
    filter: "bottom-14",
    sentinelOnly: "bottom-14",
    sentinelWithFilter: "bottom-31",
  },
  "docked-open": {
    // Docked calendar consumes vertical space, push lanes up.
    filter: "bottom-3",
    sentinelOnly: "bottom-99",
    sentinelWithFilter: "bottom-116",
  },
  "docked-closed": {
    // Calendar hidden, keep filter low but sentinel clearly one lane above.
    filter: "bottom-3",
    sentinelOnly: "bottom-21",
    sentinelWithFilter: "bottom-38",
  },
};

export const TOP_LANES = {
  sentinelWithTopFilter: "top-20",
} as const;

export const DETAIL_PANEL_BOTTOM_OFFSETS = {
  calendarOpen: "bottom-96",
  calendarClosed: "bottom-18",
} as const;
