"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFunctionFaultTree = buildFunctionFaultTree;
exports.mergeFaultTrees = mergeFaultTrees;
exports.buildSystemFaultTree = buildSystemFaultTree;
const faultTreeTypes_1 = require("./faultTreeTypes");
// 从CFG生成函数级故障树
function buildFunctionFaultTree(func, cfg) {
    const funcNode = new faultTreeTypes_1.FaultNode(`FUNC_${func.name}`, faultTreeTypes_1.FaultType.Intermediate, `函数: ${func.name}`, faultTreeTypes_1.LogicGate.OR, { start: func.start, end: func.end });
    // 分析每个基本块，生成故障节点
    cfg.forEach((block) => {
        if (block.statements.length === 0)
            return;
        // 根据块类型生成对应逻辑门
        let gate = faultTreeTypes_1.LogicGate.OR;
        if (block.id.startsWith("IF_")) {
            gate = faultTreeTypes_1.LogicGate.OR; // 条件分支故障用OR门
        }
        else if (block.statements.some(s => s.startsWith("CALL:"))) {
            gate = faultTreeTypes_1.LogicGate.AND; // 函数调用故障用AND门
        }
        const blockNode = new faultTreeTypes_1.FaultNode(`BLOCK_${block.id}`, faultTreeTypes_1.FaultType.Condition, block.statements.join("; "), gate);
        // 添加子节点（如函数调用的故障）
        block.statements.forEach((stmt) => {
            if (stmt.startsWith("CALL:")) {
                const callee = stmt.split(": ")[1];
                blockNode.addChild(new faultTreeTypes_1.FaultNode(`CALL_${callee}`, faultTreeTypes_1.FaultType.Primary, `调用故障: ${callee}`, faultTreeTypes_1.LogicGate.OR));
            }
        });
        funcNode.addChild(blockNode);
    });
    return funcNode;
}
// 递归合并故障树（基于函数调用关系）
function mergeFaultTrees(rootFunc, funcTrees, callGraph) {
    const rootTree = funcTrees.get(rootFunc);
    if (!rootTree) {
        console.error(`未找到根函数 ${rootFunc} 的故障树`);
        return null;
    }
    // 递归处理子调用
    function recurseMerge(node) {
        node.children.forEach((child) => {
            if (child.type === faultTreeTypes_1.FaultType.Primary && child.label.startsWith("调用故障:")) {
                const callee = child.label.split(": ")[1];
                const calleeTree = funcTrees.get(callee);
                if (calleeTree) {
                    // 替换调用节点为被调用函数的故障树
                    node.children = node.children.map((c) => c.id === child.id ? calleeTree : c);
                    recurseMerge(calleeTree); // 深度优先合并
                }
            }
            else {
                recurseMerge(child);
            }
        });
    }
    recurseMerge(rootTree);
    return rootTree;
}
// 生成系统级故障树
function buildSystemFaultTree(mergedTree) {
    const systemTree = new faultTreeTypes_1.FaultNode("SYSTEM", faultTreeTypes_1.FaultType.Top, "系统级故障树", faultTreeTypes_1.LogicGate.AND);
    systemTree.addChild(mergedTree);
    return systemTree;
}
//# sourceMappingURL=faultTreeBuilder.js.map