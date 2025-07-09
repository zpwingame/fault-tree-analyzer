export declare enum FaultType {
    Primary = "primary",// 基本事件（如空指针）
    Intermediate = "intermediate",// 中间事件（如函数故障）
    Top = "top",// 顶层事件（系统故障）
    Condition = "condition"
}
export declare enum LogicGate {
    AND = "and",
    OR = "or",
    NOT = "not"
}
export declare class FaultNode {
    id: string;
    type: FaultType;
    label: string;
    gate: LogicGate;
    children: FaultNode[];
    location?: {
        start: number;
        end: number;
    };
    constructor(id: string, type: FaultType, label: string, gate?: LogicGate, location?: {
        start: number;
        end: number;
    });
    addChild(child: FaultNode): void;
    toMermaid(suffix?: string): string;
    toMermaidNodeId(suffix?: string): string;
}
export declare class BasicBlock {
    id: string;
    statements: string[];
    predecessors: BasicBlock[];
    successors: BasicBlock[];
    constructor(id: string);
    addStatement(statement: string): void;
    addSuccessor(block: BasicBlock): void;
}
export declare class FunctionCallNode {
    name: string;
    calls: string[];
    start: number;
    end: number;
    constructor(name: string, start: number, end: number);
}
