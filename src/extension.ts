import * as vscode from "vscode";
import { initParser, parseCode, extractFunctionCalls, buildCFG } from "./astParser";
import { buildFunctionFaultTree, mergeFaultTrees, buildSystemFaultTree } from "./faultTreeBuilder";
import { showFaultTreeWebview } from "./faultTreeVisualizer";
import { FunctionCallNode, FaultNode } from "./faultTreeTypes";

export function activate(context: vscode.ExtensionContext) {
  // 注册左侧导航栏TreeView
  class FaultTreeItem extends vscode.TreeItem {
    constructor(label: string) {
      super(label);
      this.contextValue = "faultTreeItem";
    }
  }
  class FaultTreeProvider implements vscode.TreeDataProvider<FaultTreeItem> {
    getTreeItem(element: FaultTreeItem): vscode.TreeItem {
      return element;
    }
    getChildren(element?: FaultTreeItem): Thenable<FaultTreeItem[]> {
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
  let disposable = vscode.commands.registerCommand(
    "faultTreeAnalyzer.generate",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("请打开一个代码文件");
        return;
      }

      try {
        // 1. 解析代码
        const parser = await initParser("swift"); // 支持其他语言需替换
        const code = editor.document.getText();
        const ast = parseCode(parser, code);

        // 2. 提取函数调用关系和控制流图
        const callGraph = extractFunctionCalls(ast);
        const cfg = buildCFG(ast);

        // 3. 生成函数级故障树
        const funcTrees = new Map<string, FaultNode>();
        callGraph.forEach((func) => {
          const funcTree = buildFunctionFaultTree(func, cfg);
          funcTrees.set(func.name, funcTree);
        });

        // 4. 合并故障树（以入口函数为例，如"main"）
        const rootFunc = "main"; // 可配置为项目入口函数
        const mergedTree = mergeFaultTrees(rootFunc, funcTrees, callGraph);
        if (!mergedTree) {
          vscode.window.showErrorMessage("未找到入口函数的故障树");
          return;
        }
        const systemTree = buildSystemFaultTree(mergedTree);

        // 5. 可视化显示
        showFaultTreeWebview(context, systemTree);
        console.log(systemTree)
        vscode.window.showInformationMessage("故障树生成成功");
      } catch (err) {
        vscode.window.showErrorMessage(`生成失败: ${(err as Error).message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
