import * as vscode from "vscode";
import { initParser, parseCode, extractFunctionCalls, buildCFG } from "./astParser";
import { buildFunctionFaultTree, mergeFaultTrees, buildSystemFaultTree } from "./faultTreeBuilder";
import { showFaultTreeWebview } from "./faultTreeVisualizer";
import { FunctionCallNode, FaultNode } from "./faultTreeTypes";

// 递归渲染 FaultNode 为 Markdown 树状文本
function renderFaultTreeMarkdown(node: FaultNode, depth = 0): string {
  const indent = "  ".repeat(depth);
  let line = `${indent}- **${node.label}** (${node.gate || ""})`;
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      line += "\n" + renderFaultTreeMarkdown(child, depth + 1);
    }
  }
  return line;
}

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
          (() => {
            const item = new FaultTreeItem("生成故障树");
            item.contextValue = "faultTreeRoot";
            return item;
          })()
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
        // 1. 自动识别语言并解析代码
        const fileName = editor.document.fileName;
        let language = "swift";
        if (fileName.endsWith(".c")) language = "c";
        else if (fileName.endsWith(".cpp") || fileName.endsWith(".cc") || fileName.endsWith(".cxx")) language = "cpp";
        else if (fileName.endsWith(".swift")) language = "swift";
        // 也可扩展更多语言

        const parser = await initParser(language);
        const code = editor.document.getText();
        const ast = parseCode(parser, code);

        // 2. 提取函数调用关系和控制流图
        const callGraph = extractFunctionCalls(ast, language);
        const cfg = buildCFG(ast, language);

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

  // 注册批量分析命令
  let disposableAll = vscode.commands.registerCommand(
    "faultTreeAnalyzer.generateAll",
    async () => {
      // 1. 查找所有 C/C++/Swift 源文件
      const files = await vscode.workspace.findFiles('**/*.{c,cpp,cc,cxx,swift}');
      if (files.length === 0) {
        vscode.window.showWarningMessage("未找到任何 C/C++/Swift 源文件");
        return;
      }
      // 2. 依次读取并分析所有文件
      // 为每个文件单独生成 .md 故障树文件
      const path = await import("path");
      const fs = await import("fs/promises");

      for (const file of files) {
        const doc = await vscode.workspace.openTextDocument(file);
        const code = doc.getText();
        const fileName = file.fsPath;
        let language = "swift";
        if (fileName.endsWith(".c")) language = "c";
        else if (fileName.endsWith(".cpp") || fileName.endsWith(".cc") || fileName.endsWith(".cxx")) language = "cpp";
        else if (fileName.endsWith(".swift")) language = "swift";
        try {
          const parser = await initParser(language);
          const ast = parseCode(parser, code);
          const callGraph = extractFunctionCalls(ast, language);
          const cfg = buildCFG(ast, language);

          // 生成所有函数的故障树 Markdown
          let md = `# ${path.basename(fileName)} 函数级故障树\n\n`;
          callGraph.forEach((func) => {
            const funcTree = buildFunctionFaultTree(func, cfg);
            md += renderFaultTreeMarkdown(funcTree) + "\n\n";
          });

          // 计算相对路径，生成 fault_tree_markdown 目录下的 md 文件
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage("未找到工作区根目录，无法生成故障树 Markdown 文件");
            continue;
          }
          const workspaceRoot = workspaceFolders[0].uri.fsPath;
          const relPath = path.relative(workspaceRoot, fileName);
          const mdPath = path.join(workspaceRoot, "fault_tree_markdown", relPath + ".md");
          // 确保目标目录存在
          await fs.mkdir(path.dirname(mdPath), { recursive: true });
          await fs.writeFile(mdPath, md, "utf-8");
        } catch (err) {
          vscode.window.showWarningMessage(`文件 ${fileName} 解析失败: ${(err as Error).message}`);
        }
      }
      vscode.window.showInformationMessage(`批量故障树分析完成，已为每个源文件生成 .md 故障树文件`);
    }
  );
  context.subscriptions.push(disposableAll);
}

export function deactivate() {}
