import * as vscode from 'vscode';
import { getGraphData, searchGraphData, getTrailData } from '../repository/engramRepository';
import { IPC_CHANNELS, CONFIG_NAMESPACE, CONFIG_KEYS } from '../../constants/ipc';
import { GRAPH_STATES } from '../../constants/types';

/**
 * Reads the current Engram Nexus configuration from VS Code workspace settings.
 * All values fall back to sensible defaults if not configured by the user.
 *
 * @returns The current extension configuration as a plain object.
 */
function getNexusConfig() {
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  const colors = vscode.workspace.getConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEYS.COLORS}`);
  return {
    rootNodeLabel: config.get<string>(CONFIG_KEYS.ROOT_NODE_LABEL, 'SOMA'),
    maxNodes: config.get<number>(CONFIG_KEYS.MAX_NODES, 100),
    calendarDefaultCorner: config.get<string>(CONFIG_KEYS.CALENDAR_DEFAULT_CORNER, 'right'),
    floatCalendarThreshold: config.get<number>(CONFIG_KEYS.FLOAT_CALENDAR_THRESHOLD, 380),
    filterPanelSide: config.get<string>(CONFIG_KEYS.FILTER_PANEL_SIDE, 'left'),
    defaultGraphState: config.get<string>(CONFIG_KEYS.DEFAULT_GRAPH_STATE, GRAPH_STATES.COLLAPSED),
    nodeColors: {
      decision:        colors.get<string>('decision',        '#f59e0b'),
      architecture:    colors.get<string>('architecture',    '#3b82f6'),
      bugfix:          colors.get<string>('bugfix',          '#ef4444'),
      pattern:         colors.get<string>('pattern',         '#a855f7'),
      learning:        colors.get<string>('learning',        '#22c55e'),
      session_summary: colors.get<string>('session_summary', '#94a3b8'),
      feature:         colors.get<string>('feature',         '#06b6d4'),
      config:          colors.get<string>('config',          '#f97316'),
      discovery:       colors.get<string>('discovery',       '#10b981'),
      manual:          colors.get<string>('manual',          '#64748b'),
    },
  };
}

/**
 * Central IPC message router for the Engram Nexus webview.
 *
 * Dispatches incoming messages from the webview to the appropriate backend
 * handler based on the `command` field. All data responses are posted back
 * to the webview via `webviewView.webview.postMessage`.
 *
 * Supported commands (see {@link IPC_CHANNELS}):
 * - `FETCH_DATA`     — Loads the full knowledge graph with optional filters.
 * - `SEARCH`         — Runs a full-text search (FTS5) and returns matching nodes.
 * - `GET_SETTINGS`   — Pushes the current extension config to the webview.
 * - `INJECT_CONTEXT` — Copies formatted memory content to the clipboard.
 *
 * @param message - The incoming IPC message with a `command` and optional `payload`.
 * @param webviewView - The VS Code webview instance used to post responses back.
 */
export async function handleMessage(
  message: { command: string; payload?: unknown },
  webviewView: vscode.WebviewView
) {
  const { command, payload } = message;

  switch (command) {
    case IPC_CHANNELS.FETCH_DATA:
      try {
        const { rootNodeLabel, maxNodes } = getNexusConfig();
        const filters = { ...((payload as object) || {}), limit: maxNodes };
        const graphData = await getGraphData(filters, rootNodeLabel);
        webviewView.webview.postMessage({
          command: IPC_CHANNELS.DATA_LOADED,
          payload: graphData,
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Engram Graph Error: ${msg}`);
        webviewView.webview.postMessage({
          command: IPC_CHANNELS.ERROR,
          payload: msg,
        });
      }
      break;

    case IPC_CHANNELS.SEARCH:
      try {
        const { rootNodeLabel, maxNodes } = getNexusConfig();
        const { searchTerm, filters } = payload as {
          searchTerm: string;
          filters?: object;
        };
        const graphData = await searchGraphData(
          searchTerm,
          { ...((filters as object) || {}), limit: maxNodes },
          rootNodeLabel
        );
        webviewView.webview.postMessage({
          command: IPC_CHANNELS.DATA_LOADED,
          payload: graphData,
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Engram Search Error: ${msg}`);
        webviewView.webview.postMessage({
          command: IPC_CHANNELS.ERROR,
          payload: msg,
        });
      }
      break;

    case IPC_CHANNELS.GET_SETTINGS:
      webviewView.webview.postMessage({
        command: IPC_CHANNELS.SETTINGS_LOADED,
        payload: getNexusConfig(),
      });
      break;

    case IPC_CHANNELS.GET_TRAIL:
      try {
        const { topicKey, sessionId } = (payload as { topicKey?: string; sessionId?: string }) ?? {};
        const trail = await getTrailData(topicKey, sessionId);
        webviewView.webview.postMessage({
          command: IPC_CHANNELS.TRAIL_LOADED,
          payload: trail,
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        webviewView.webview.postMessage({ command: IPC_CHANNELS.ERROR, payload: msg });
      }
      break;

    case IPC_CHANNELS.INJECT_CONTEXT:
      try {
        await vscode.env.clipboard.writeText(payload as string);
        vscode.window.showInformationMessage(
          '🧠 Memory copied to clipboard. Paste it in your Agent chat!'
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to copy context: ${msg}`);
      }
      break;

    default:
      console.warn(`Unknown command: ${command}`);
  }
}
