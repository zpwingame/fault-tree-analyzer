import * as vscode from "vscode";
import { Parser, Language } from "web-tree-sitter";
import { BasicBlock, FunctionCallNode } from "./faultTreeTypes";

// 初始化tree-sitter解析器
export async function initParser(language: string = "swift") {
  await Parser.init();
  const path = await import("path");
  // 保证从项目根目录的 out 目录读取 wasm
  const wasmPath = path.resolve(__dirname, "..", "out", `tree-sitter-${language}.wasm`);
  const langWasm = await Language.load(wasmPath);
  const parser = new Parser();
  parser.setLanguage(langWasm);
  return parser;
}

// 解析代码生成AST
export function parseCode(parser: Parser, code: string) {
  const tree = parser.parse(code);
  if (!tree || !tree.rootNode) {
    throw new Error("Failed to parse code: AST root node is null.");
  }
  return tree.rootNode;
}

// 从AST提取函数调用关系
export function extractFunctionCalls(ast: any): FunctionCallNode[] {
  const functions: FunctionCallNode[] = [];
  const funcMap = new Map<string, FunctionCallNode>();

  // 递归遍历AST识别函数定义和调用
  function traverse(node: any) {
    // 匹配函数定义（以Swift为例，其他语言需调整选择器）
    if (node.type === "function_declaration") {
      const funcName = node.child(1) ? node.child(1)!.text : undefined;
      if (funcName) {
        const funcNode = new FunctionCallNode(
          funcName,
          node.startIndex,
          node.endIndex
        );
        functions.push(funcNode);
        funcMap.set(funcName, funcNode);
      }
    }

    // 匹配函数调用
    if (node.type === "call_expression") {
      const callee = node.child(0) ? node.child(0)!.text : undefined;
      if (callee && funcMap.has(callee)) {
        // 找到当前函数上下文
        const currentFunc = getParentFunction(node);
        if (currentFunc && funcMap.has(currentFunc)) {
          funcMap.get(currentFunc)?.calls.push(callee);
        }
      }
    }

    // 递归子节点
    for (const child of node.children) {
      traverse(child);
    }
  }

  // 获取父函数名
  function getParentFunction(node: any): string | null {
    let parent = node.parent;
    while (parent) {
      if (parent.type === "function_declaration") {
        return parent.child(1) ? parent.child(1)!.text : null;
      }
      parent = parent.parent;
    }
    return null;
  }

  traverse(ast);
  return functions;
}

// 从AST构建控制流图(CFG)
export function buildCFG(ast: any): BasicBlock[] {
  const blocks: BasicBlock[] = [];
  const entry = new BasicBlock("ENTRY");
  blocks.push(entry);
  let currentBlock = entry;

  // 递归处理AST节点
  function processNode(node: any) {
    if (node.type === "if_statement") {
      // 处理条件分支（生成OR门节点）
      const condBlock = new BasicBlock(`IF_${node.startIndex}`);
      condBlock.addStatement(`COND: ${node.child(1) ? node.child(1)!.text : ""}`);
      currentBlock.addSuccessor(condBlock);
      blocks.push(condBlock);

      // 真分支
      const thenBlock = new BasicBlock(`THEN_${node.startIndex}`);
      condBlock.addSuccessor(thenBlock);
      blocks.push(thenBlock);
      if (node.child(2)) {
        processNode(node.child(2)!); // 递归处理then块
      }

      // 假分支（如果有else）
      const elseNode = node.child(4);
      if (elseNode) {
        const elseBlock = new BasicBlock(`ELSE_${node.startIndex}`);
        condBlock.addSuccessor(elseBlock);
        blocks.push(elseBlock);
        processNode(elseNode);
      }

      currentBlock = new BasicBlock(`MERGE_${node.startIndex}`);
      blocks.push(currentBlock);
    } else if (node.type === "call_expression") {
      // 处理函数调用（生成AND门节点）
      currentBlock.addStatement(`CALL: ${node.text}`);
    }

    // 递归处理子节点
    for (const child of node.children) {
      processNode(child);
    }
  }

  processNode(ast);
  return blocks;
}
