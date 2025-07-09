import * as vscode from "vscode";
import { FaultNode } from "./faultTreeTypes";

// 生成Mermaid可视化代码
export function generateMermaid(tree: FaultNode): string {
  return `
    graph TD
    classDef and fill:#f9f,stroke:#333,stroke-width:2px;
    classDef or fill:#fff,stroke:#333,stroke-width:2px;
    classDef not fill:#ff9,stroke:#333,stroke-width:2px;
    ${tree.toMermaid()}
  `;
}

// 在VS Code Webview中显示故障树
export function showFaultTreeWebview(context: vscode.ExtensionContext, tree: FaultNode) {
  const panel = vscode.window.createWebviewPanel(
    "faultTreeVisualizer",
    "故障树可视化",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  // 在TypeScript中定义escapeHtml函数
  function escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#39;'
      } as { [key: string]: string })[m];
    });
  }

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
      <style>
        .mermaid { max-width: 100%; overflow: auto; }
        pre.json-view { background: #f4f4f4; padding: 1em; border-radius: 6px; font-size: 14px; overflow-x: auto; color: #111; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>系统故障树分析</h1>
      <pre class="json-view">${escapeHtml(JSON.stringify(tree, null, 2))}</pre>
      <div class="mermaid">${generateMermaid(tree)}</div>
      <script>
        mermaid.initialize({ startOnLoad: true });
      </script>
    </body>
    </html>
  `;
}
