// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const acquireVsCodeApi: any;

interface VSCodeApi {
  postMessage: (msg: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

class VSCodeAPI {
  private vscode: VSCodeApi;

  constructor() {
    if (typeof acquireVsCodeApi !== "undefined") {
      this.vscode = acquireVsCodeApi();
    } else {
      console.warn("acquireVsCodeApi not found. Running outside of VS Code Webview.");
      this.vscode = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        postMessage: (_msg: unknown) => {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setState: (_state: unknown) => {},
        getState: () => ({}),
      };
    }
  }

  public postMessage(message: unknown) {
    this.vscode.postMessage(message);
  }

  public getState() {
    return this.vscode.getState();
  }

  public setState(state: unknown) {
    return this.vscode.setState(state);
  }
}

export const vscode = new VSCodeAPI();
