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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const astParser_1 = require("./astParser");
const faultTreeBuilder_1 = require("./faultTreeBuilder");
const faultTreeVisualizer_1 = require("./faultTreeVisualizer");
function activate(context) {
    // 注册左侧导航栏TreeView
    class FaultTreeItem extends vscode.TreeItem {
        constructor(label) {
            super(label);
            this.contextValue = "faultTreeItem";
        }
    }
    class FaultTreeProvider {
        getTreeItem(element) {
            return element;
        }
        getChildren(element) {
            if (!element) {
                return Promise.resolve([
                    new FaultTreeItem("故障树分析插件已激活")
                ]);
            }
            return Promise.resolve([]);
        }
    }
    const faultTreeProvider = new FaultTreeProvider();
    const treeView = vscode.window.createTreeView("faultTreeTreeView", {
        treeDataProvider: faultTreeProvider,
        showCollapseAll: false
    });
    context.subscriptions.push(treeView);
    let disposable = vscode.commands.registerCommand("faultTreeAnalyzer.generate", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("请打开一个代码文件");
            return;
        }
        try {
            // 1. 解析代码
            const parser = await (0, astParser_1.initParser)("swift"); // 支持其他语言需替换
            const code = editor.document.getText();
            const ast = (0, astParser_1.parseCode)(parser, code);
            // 2. 提取函数调用关系和控制流图
            const callGraph = (0, astParser_1.extractFunctionCalls)(ast);
            const cfg = (0, astParser_1.buildCFG)(ast);
            // 3. 生成函数级故障树
            const funcTrees = new Map();
            callGraph.forEach((func) => {
                const funcTree = (0, faultTreeBuilder_1.buildFunctionFaultTree)(func, cfg);
                funcTrees.set(func.name, funcTree);
            });
            // 4. 合并故障树（以入口函数为例，如"main"）
            const rootFunc = "main"; // 可配置为项目入口函数
            const mergedTree = (0, faultTreeBuilder_1.mergeFaultTrees)(rootFunc, funcTrees, callGraph);
            if (!mergedTree) {
                vscode.window.showErrorMessage("未找到入口函数的故障树");
                return;
            }
            const systemTree = (0, faultTreeBuilder_1.buildSystemFaultTree)(mergedTree);
            // 5. 可视化显示
            (0, faultTreeVisualizer_1.showFaultTreeWebview)(context, systemTree);
            console.log(systemTree);
            vscode.window.showInformationMessage("故障树生成成功");
        }
        catch (err) {
            vscode.window.showErrorMessage(`生成失败: ${err.message}`);
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map