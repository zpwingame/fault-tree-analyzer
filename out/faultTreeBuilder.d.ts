import { FaultNode, BasicBlock, FunctionCallNode } from "./faultTreeTypes";
export declare function buildFunctionFaultTree(func: FunctionCallNode, cfg: BasicBlock[]): FaultNode;
export declare function mergeFaultTrees(rootFunc: string, funcTrees: Map<string, FaultNode>, callGraph: FunctionCallNode[]): FaultNode | null;
export declare function buildSystemFaultTree(mergedTree: FaultNode): FaultNode;
