"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionCallNode = exports.BasicBlock = exports.FaultNode = exports.LogicGate = exports.FaultType = void 0;
// 故障树节点类型
var FaultType;
(function (FaultType) {
    FaultType["Primary"] = "primary";
    FaultType["Intermediate"] = "intermediate";
    FaultType["Top"] = "top";
    FaultType["Condition"] = "condition"; // 条件事件（如if判断失败）
})(FaultType || (exports.FaultType = FaultType = {}));
// 逻辑门类型
var LogicGate;
(function (LogicGate) {
    LogicGate["AND"] = "and";
    LogicGate["OR"] = "or";
    LogicGate["NOT"] = "not";
})(LogicGate || (exports.LogicGate = LogicGate = {}));
// 故障树节点
class FaultNode {
    constructor(id, type, label, gate = LogicGate.OR, location) {
        this.id = id;
        this.type = type;
        this.label = label;
        this.gate = gate;
        this.children = [];
        this.location = location;
    }
    addChild(child) {
        this.children.push(child);
    }
    // 转换为Mermaid语法
    toMermaid(suffix = "") {
        const nodeId = `${this.id}_${suffix}`.replace(/\W/g, "_");
        let nodes = [`${nodeId}["${this.label}"]:::${this.gate}`];
        let edges = [];
        this.children.forEach((child, index) => {
            const childId = child.toMermaidNodeId(`${suffix}_${index}`);
            edges.push(`${nodeId} --> ${childId}`);
            const childMermaid = child.toMermaid(`${suffix}_${index}`);
            nodes.push(childMermaid);
        });
        return nodes.concat(edges).join('\n');
    }
    // 获取Mermaid节点ID（辅助函数）
    toMermaidNodeId(suffix = "") {
        return `${this.id}_${suffix}`.replace(/\W/g, "_");
    }
}
exports.FaultNode = FaultNode;
// 控制流图基本块
class BasicBlock {
    constructor(id) {
        this.id = id;
        this.statements = [];
        this.predecessors = [];
        this.successors = [];
    }
    addStatement(statement) {
        this.statements.push(statement);
    }
    addSuccessor(block) {
        this.successors.push(block);
        block.predecessors.push(this);
    }
}
exports.BasicBlock = BasicBlock;
// 函数调用图节点
class FunctionCallNode {
    constructor(name, start, end) {
        this.name = name;
        this.calls = [];
        this.start = start;
        this.end = end;
    }
}
exports.FunctionCallNode = FunctionCallNode;
//# sourceMappingURL=faultTreeTypes.js.map