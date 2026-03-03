import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { handleMessage } from '../backend/ipc/messageHandler';
import { IPC_CHANNELS, CONFIG_NAMESPACE, CONFIG_KEYS } from '../constants/ipc';

export class GraphViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'engram-nexus.graphView';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      handleMessage(data, webviewView);
    });

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_NAMESPACE)) {
        if (
          e.affectsConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEYS.MAX_NODES}`) ||
          e.affectsConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEYS.ROOT_NODE_LABEL}`)
        ) {
          webviewView.webview.postMessage({ command: IPC_CHANNELS.REFRESH_DATA });
        } else {
          handleMessage({ command: IPC_CHANNELS.GET_SETTINGS }, webviewView);
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const webviewPath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build');
    const diskPath = path.join(this._extensionUri.fsPath, 'webview-ui', 'build', 'index.html');

    if (!fs.existsSync(diskPath)) {
      return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Engram Nexus</title>
                </head>
                <body>
                    <h1>Webview UI not built</h1>
                    <p>Please run <code>npm run build:webview</code> in the project root to build the React application.</p>
                    <p>Expected path: ${diskPath}</p>
                </body>
                </html>`;
    }

    let htmlContent = fs.readFileSync(diskPath, 'utf8');

    // We preserve other attributes by only replacing the value of src/href
    const scriptRegex = /(src|href)="\/([^"]+)"/g;
    htmlContent = htmlContent.replace(scriptRegex, (match, attr, src) => {
      const uri = webview.asWebviewUri(vscode.Uri.joinPath(webviewPath, src));
      return `${attr}="${uri}"`;
    });

    const nonce = getNonce();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} https:; font-src ${webview.cspSource}; connect-src ${webview.cspSource} https: http://127.0.0.1:7438 http://localhost:7438;`;

    htmlContent = htmlContent.replace(
      '<head>',
      `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`
    );

    htmlContent = htmlContent.replace(/<script/g, `<script nonce="${nonce}"`);

    return htmlContent;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
