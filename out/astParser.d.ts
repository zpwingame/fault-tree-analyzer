import { Parser } from "web-tree-sitter";
import { BasicBlock, FunctionCallNode } from "./faultTreeTypes";
export declare function initParser(language?: string): Promise<Parser>;
export declare function parseCode(parser: Parser, code: string): import("web-tree-sitter").Node;
export declare function extractFunctionCalls(ast: any): FunctionCallNode[];
export declare function buildCFG(ast: any): BasicBlock[];
