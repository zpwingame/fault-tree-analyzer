import * as vscode from "vscode";
import { FaultNode } from "./faultTreeTypes";
export declare function generateMermaid(tree: FaultNode): string;
export declare function showFaultTreeWebview(context: vscode.ExtensionContext, tree: FaultNode): void;
