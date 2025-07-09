import {
  FaultNode,
  FaultType,
  LogicGate,
  BasicBlock,
  FunctionCallNode
} from "./faultTreeTypes";

// 从CFG生成函数级故障树
export function buildFunctionFaultTree(
  func: FunctionCallNode,
  cfg: BasicBlock[]
): FaultNode {
  const funcNode = new FaultNode(
    `FUNC_${func.name}`,
    FaultType.Intermediate,
    `函数: ${func.name}`,
    LogicGate.OR,
    { start: func.start, end: func.end }
  );

  // 分析每个基本块，生成故障节点
  cfg.forEach((block) => {
    if (block.statements.length === 0) return;

    // 根据块类型生成对应逻辑门
    let gate = LogicGate.OR;
    if (block.id.startsWith("IF_")) {
      gate = LogicGate.OR; // 条件分支故障用OR门
    } else if (block.statements.some(s => s.startsWith("CALL:"))) {
      gate = LogicGate.AND; // 函数调用故障用AND门
    }

    const blockNode = new FaultNode(
      `BLOCK_${block.id}`,
      FaultType.Condition,
      block.statements.join("; "),
      gate
    );

    // 添加子节点（如函数调用的故障）
    block.statements.forEach((stmt) => {
      if (stmt.startsWith("CALL:")) {
        const callee = stmt.split(": ")[1];
        blockNode.addChild(
          new FaultNode(
            `CALL_${callee}`,
            FaultType.Primary,
            `调用故障: ${callee}`,
            LogicGate.OR
          )
        );
      }
    });

    funcNode.addChild(blockNode);
  });

  return funcNode;
}

// 递归合并故障树（基于函数调用关系）
export function mergeFaultTrees(
  rootFunc: string,
  funcTrees: Map<string, FaultNode>,
  callGraph: FunctionCallNode[]
): FaultNode | null {
  const rootTree = funcTrees.get(rootFunc);
  if (!rootTree) {
    console.error(`未找到根函数 ${rootFunc} 的故障树`);
    return null;
  }

  // 递归处理子调用
  function recurseMerge(node: FaultNode) {
    node.children.forEach((child) => {
      if (child.type === FaultType.Primary && child.label.startsWith("调用故障:")) {
        const callee = child.label.split(": ")[1];
        const calleeTree = funcTrees.get(callee);
        if (calleeTree) {
          // 替换调用节点为被调用函数的故障树
          node.children = node.children.map((c) =>
            c.id === child.id ? calleeTree : c
          );
          recurseMerge(calleeTree); // 深度优先合并
        }
      } else {
        recurseMerge(child);
      }
    });
  }

  recurseMerge(rootTree);
  return rootTree;
}

// 生成系统级故障树
export function buildSystemFaultTree(mergedTree: FaultNode): FaultNode {
  const systemTree = new FaultNode(
    "SYSTEM",
    FaultType.Top,
    "系统级故障树",
    LogicGate.AND
  );
  systemTree.addChild(mergedTree);
  return systemTree;
}
