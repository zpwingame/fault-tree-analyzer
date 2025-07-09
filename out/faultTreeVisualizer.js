"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMermaid = generateMermaid;
exports.showFaultTreeWebview = showFaultTreeWebview;
const vscode = __importStar(require("vscode"));
// 生成Mermaid可视化代码
function generateMermaid(tree) {
    return `
    graph TD
    classDef and fill:#f9f,stroke:#333,stroke-width:2px;
    classDef or fill:#fff,stroke:#333,stroke-width:2px;
    classDef not fill:#ff9,stroke:#333,stroke-width:2px;
    ${tree.toMermaid()}
  `;
}
// 在VS Code Webview中显示故障树
function showFaultTreeWebview(context, tree) {
    const panel = vscode.window.createWebviewPanel("faultTreeVisualizer", "故障树可视化", vscode.ViewColumn.One, { enableScripts: true });
    // 在TypeScript中定义escapeHtml函数
    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&',
                '<': '<',
                '>': '>',
                '"': '"',
                "'": '&#39;'
            }[m];
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
//# sourceMappingURL=faultTreeVisualizer.js.map