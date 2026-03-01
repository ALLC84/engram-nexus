import { useState, useEffect } from "react";
import { vscode } from "../vscode";
import { IPC_CHANNELS } from "../constants/ipc";
import { GRAPH_STATES, FILTER_PANEL_SIDES, FLOAT_CORNERS, VIEW_MODES } from "../constants/types";
import type { FilterPanelSide, FloatCorner, GraphState, ViewMode } from "../constants/types";
import type { NexusSettings } from "../types/graph.d";

/**
 * Centralises VS Code extension settings and theme state.
 * Fires the `GET_SETTINGS` request on mount, listens for `SETTINGS_LOADED`,
 * and observes the DOM for VS Code theme class changes.
 * Returns both the settings values and their associated toggle actions.
 */
export function useGraphSettings() {
  const [floatCorner, setFloatCorner] = useState<FloatCorner>(FLOAT_CORNERS.RIGHT);
  const [floatThreshold, setFloatThreshold] = useState(380);
  const [filterPanelSide, setFilterPanelSide] = useState<FilterPanelSide>(FILTER_PANEL_SIDES.TOP);
  const [defaultGraphState, setDefaultGraphState] = useState<GraphState>(GRAPH_STATES.EXPANDED);
  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>(VIEW_MODES.GRAPH);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [nodeColors, setNodeColors] = useState<Record<string, string>>({});
  // Lazy initializer reads the DOM once at mount — avoids a synchronous setState
  // call inside the effect body which would trigger a cascading render.
  const [isDark, setIsDark] = useState(() => !document.body.classList.contains("vscode-light"));

  useEffect(() => {
    const themeObserver = new MutationObserver(() => {
      const hasManualLight = document.body.classList.contains("theme-light");
      const hasManualDark = document.body.classList.contains("theme-dark");
      if (hasManualLight) {
        setIsDark(false);
      } else if (hasManualDark) {
        setIsDark(true);
      } else {
        setIsDark(!document.body.classList.contains("vscode-light"));
      }
    });

    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data as { command: string; payload: unknown };
      if (message.command === IPC_CHANNELS.SETTINGS_LOADED) {
        const s = message.payload as Partial<NexusSettings>;
        if (s.calendarDefaultCorner) setFloatCorner(s.calendarDefaultCorner as FloatCorner);
        if (s.floatCalendarThreshold) setFloatThreshold(s.floatCalendarThreshold);
        if (s.filterPanelSide) setFilterPanelSide(s.filterPanelSide as FilterPanelSide);
        if (s.defaultGraphState) setDefaultGraphState(s.defaultGraphState as GraphState);
        if (s.defaultViewMode) setDefaultViewMode(s.defaultViewMode as ViewMode);
        if (s.nodeColors) setNodeColors(s.nodeColors);
        setSettingsLoaded(true);
      }
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ command: IPC_CHANNELS.GET_SETTINGS });

    return () => {
      window.removeEventListener("message", handleMessage);
      themeObserver.disconnect();
    };
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    if (nextIsDark) {
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
    } else {
      document.body.classList.add("theme-light");
      document.body.classList.remove("theme-dark");
    }
  };

  const toggleCorner = () => {
    setFloatCorner((prev) =>
      prev === FLOAT_CORNERS.RIGHT ? FLOAT_CORNERS.LEFT : FLOAT_CORNERS.RIGHT
    );
  };

  return {
    floatCorner,
    floatThreshold,
    filterPanelSide,
    defaultGraphState,
    defaultViewMode,
    settingsLoaded,
    isDark,
    nodeColors,
    toggleTheme,
    toggleCorner,
  };
}
