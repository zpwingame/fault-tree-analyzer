// 故障树节点类型
export enum FaultType {
  Primary = "primary",       // 基本事件（如空指针）
  Intermediate = "intermediate", // 中间事件（如函数故障）
  Top = "top",               // 顶层事件（系统故障）
  Condition = "condition"    // 条件事件（如if判断失败）
}

// 逻辑门类型
export enum LogicGate {
  AND = "and",
  OR = "or",
  NOT = "not"
}

// 故障树节点
export class FaultNode {
  id: string;
  type: FaultType;
  label: string;
  gate: LogicGate;
  children: FaultNode[];
  location?: { start: number; end: number }; // 代码位置

  constructor(
    id: string,
    type: FaultType,
    label: string,
    gate: LogicGate = LogicGate.OR,
    location?: { start: number; end: number }
  ) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.gate = gate;
    this.children = [];
    this.location = location;
  }

  addChild(child: FaultNode) {
    this.children.push(child);
  }

  // 转换为Mermaid语法
  toMermaid(suffix = ""): string {
    const nodeId = `${this.id}_${suffix}`.replace(/\W/g, "_");
    let nodes: string[] = [`${nodeId}["${this.label}"]:::${this.gate}`];
    let edges: string[] = [];

    this.children.forEach((child, index) => {
      const childId = child.toMermaidNodeId(`${suffix}_${index}`);
      edges.push(`${nodeId} --> ${childId}`);
      const childMermaid = child.toMermaid(`${suffix}_${index}`);
      nodes.push(childMermaid);
    });

    return nodes.concat(edges).join('\n');
  }

  // 获取Mermaid节点ID（辅助函数）
  toMermaidNodeId(suffix = ""): string {
    return `${this.id}_${suffix}`.replace(/\W/g, "_");
  }
}

// 控制流图基本块
export class BasicBlock {
  id: string;
  statements: string[]; // 块内语句
  predecessors: BasicBlock[];
  successors: BasicBlock[];

  constructor(id: string) {
    this.id = id;
    this.statements = [];
    this.predecessors = [];
    this.successors = [];
  }

  addStatement(statement: string) {
    this.statements.push(statement);
  }

  addSuccessor(block: BasicBlock) {
    this.successors.push(block);
    block.predecessors.push(this);
  }
}

// 函数调用图节点
export class FunctionCallNode {
  name: string;
  calls: string[]; // 被调用的函数名
  start: number;
  end: number;

  constructor(name: string, start: number, end: number) {
    this.name = name;
    this.calls = [];
    this.start = start;
    this.end = end;
  }
}
