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

/**
 * 从AST提取函数调用关系，支持swift/c/cpp
 * @param ast AST根节点
 * @param language 语言类型（swift/c/cpp）
 */
export function extractFunctionCalls(ast: any, language: string = "swift"): FunctionCallNode[] {
  const functions: FunctionCallNode[] = [];
  const funcMap = new Map<string, FunctionCallNode>();

  // 不同语言的函数定义节点类型
  const funcDefTypes: Record<string, string[]> = {
    swift: ["function_declaration"],
    c: ["function_definition"],
    cpp: ["function_definition"],
  };
  // 不同语言的函数名子节点索引
  const funcNameIndex: Record<string, number> = {
    swift: 1,
    c: 1,
    cpp: 1,
  };
  // 函数调用节点类型
  const callExprTypes: Record<string, string[]> = {
    swift: ["call_expression"],
    c: ["call_expression"],
    cpp: ["call_expression"],
  };

  function isFuncDef(node: any) {
    return funcDefTypes[language]?.includes(node.type);
  }
  function isCallExpr(node: any) {
    return callExprTypes[language]?.includes(node.type);
  }
  function getFuncName(node: any) {
    if (language === "swift") {
      const idx = funcNameIndex[language] ?? 1;
      return node.child(idx) ? node.child(idx)!.text : undefined;
    } else if (language === "c" || language === "cpp") {
      // C: function_definition -> type_specifier declarator compound_statement
      // C++: function_definition -> primitive_type function_declarator compound_statement
      // 递归查找 function_declarator 或 declarator 下的 identifier
      const declNode = node.namedChildren?.find(
        (c: any) =>
          c.type === "function_declarator" ||
          c.type === "declarator"
      );
      if (declNode) {
        function findIdentifier(n: any): string | undefined {
          if (n.type === "identifier") return n.text;
          for (const child of n.namedChildren || []) {
            const id = findIdentifier(child);
            if (id) return id;
          }
          return undefined;
        }
        return findIdentifier(declNode);
      }
      return undefined;
    }
    return undefined;
  }

  // 递归遍历AST识别函数定义和调用
  function traverse(node: any, parentNode: any = null) {
    // 匹配函数定义
    if (isFuncDef(node)) {
      const funcName = getFuncName(node);
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
    if (isCallExpr(node)) {
      const callee = node.child(0) ? node.child(0)!.text : undefined;
      if (callee && funcMap.has(callee)) {
        // 找到当前函数上下文
        const currentFunc = getParentFunctionFromAncestors(parentNode);
        if (currentFunc && funcMap.has(currentFunc)) {
          funcMap.get(currentFunc)?.calls.push(callee);
        }
      }
    }

    // 递归子节点，传递 parentNode
    for (const child of node.children) {
      traverse(child, node);
    }
  }

  // 递归向上传递 parentNode 获取父函数名
  function getParentFunctionFromAncestors(node: any): string | null {
    let current = node;
    while (current) {
      if (isFuncDef(current)) {
        return getFuncName(current);
      }
      current = current.__parentForCallGraph;
    }
    return null;
  }

  // 启动遍历时，给每个节点加 __parentForCallGraph 链（避免污染 tree-sitter 的 parent 属性）
  function traverseWithParentChain(node: any, parent: any = null) {
    node.__parentForCallGraph = parent;
    // 匹配函数定义
    if (isFuncDef(node)) {
      const funcName = getFuncName(node);
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
    if (isCallExpr(node)) {
      const callee = node.child(0) ? node.child(0)!.text : undefined;
      if (callee && funcMap.has(callee)) {
        const currentFunc = getParentFunctionFromAncestors(parent);
        if (currentFunc && funcMap.has(currentFunc)) {
          funcMap.get(currentFunc)?.calls.push(callee);
        }
      }
    }
    for (const child of node.children) {
      traverseWithParentChain(child, node);
    }
  }

  // traverse(ast); // 原递归
  traverseWithParentChain(ast, null); // 新递归
  return functions;
}

// 从AST构建控制流图(CFG)，支持swift/c/cpp
export function buildCFG(ast: any, language: string = "swift"): BasicBlock[] {
  const blocks: BasicBlock[] = [];
  const entry = new BasicBlock("ENTRY");
  blocks.push(entry);
  let currentBlock = entry;

  // 不同语言的if语句节点类型
  const ifStmtTypes: Record<string, string[]> = {
    swift: ["if_statement"],
    c: ["if_statement"],
    cpp: ["if_statement"],
  };
  // 函数调用节点类型
  const callExprTypes: Record<string, string[]> = {
    swift: ["call_expression"],
    c: ["call_expression"],
    cpp: ["call_expression"],
  };

  function isIfStmt(node: any) {
    return ifStmtTypes[language]?.includes(node.type);
  }
  function isCallExpr(node: any) {
    return callExprTypes[language]?.includes(node.type);
  }

  // 递归处理AST节点
  function processNode(node: any) {
    if (isIfStmt(node)) {
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
    } else if (isCallExpr(node)) {
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
