"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initParser = initParser;
exports.parseCode = parseCode;
exports.extractFunctionCalls = extractFunctionCalls;
exports.buildCFG = buildCFG;
const web_tree_sitter_1 = require("web-tree-sitter");
const faultTreeTypes_1 = require("./faultTreeTypes");
// 初始化tree-sitter解析器
async function initParser(language = "swift") {
    await web_tree_sitter_1.Parser.init();
    const path = await Promise.resolve().then(() => __importStar(require("path")));
    // 保证从项目根目录的 out 目录读取 wasm
    const wasmPath = path.resolve(__dirname, "..", "out", `tree-sitter-${language}.wasm`);
    const langWasm = await web_tree_sitter_1.Language.load(wasmPath);
    const parser = new web_tree_sitter_1.Parser();
    parser.setLanguage(langWasm);
    return parser;
}
// 解析代码生成AST
function parseCode(parser, code) {
    const tree = parser.parse(code);
    if (!tree || !tree.rootNode) {
        throw new Error("Failed to parse code: AST root node is null.");
    }
    return tree.rootNode;
}
// 从AST提取函数调用关系
function extractFunctionCalls(ast) {
    const functions = [];
    const funcMap = new Map();
    // 递归遍历AST识别函数定义和调用
    function traverse(node) {
        // 匹配函数定义（以Swift为例，其他语言需调整选择器）
        if (node.type === "function_declaration") {
            const funcName = node.child(1) ? node.child(1).text : undefined;
            if (funcName) {
                const funcNode = new faultTreeTypes_1.FunctionCallNode(funcName, node.startIndex, node.endIndex);
                functions.push(funcNode);
                funcMap.set(funcName, funcNode);
            }
        }
        // 匹配函数调用
        if (node.type === "call_expression") {
            const callee = node.child(0) ? node.child(0).text : undefined;
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
    function getParentFunction(node) {
        let parent = node.parent;
        while (parent) {
            if (parent.type === "function_declaration") {
                return parent.child(1) ? parent.child(1).text : null;
            }
            parent = parent.parent;
        }
        return null;
    }
    traverse(ast);
    return functions;
}
// 从AST构建控制流图(CFG)
function buildCFG(ast) {
    const blocks = [];
    const entry = new faultTreeTypes_1.BasicBlock("ENTRY");
    blocks.push(entry);
    let currentBlock = entry;
    // 递归处理AST节点
    function processNode(node) {
        if (node.type === "if_statement") {
            // 处理条件分支（生成OR门节点）
            const condBlock = new faultTreeTypes_1.BasicBlock(`IF_${node.startIndex}`);
            condBlock.addStatement(`COND: ${node.child(1) ? node.child(1).text : ""}`);
            currentBlock.addSuccessor(condBlock);
            blocks.push(condBlock);
            // 真分支
            const thenBlock = new faultTreeTypes_1.BasicBlock(`THEN_${node.startIndex}`);
            condBlock.addSuccessor(thenBlock);
            blocks.push(thenBlock);
            if (node.child(2)) {
                processNode(node.child(2)); // 递归处理then块
            }
            // 假分支（如果有else）
            const elseNode = node.child(4);
            if (elseNode) {
                const elseBlock = new faultTreeTypes_1.BasicBlock(`ELSE_${node.startIndex}`);
                condBlock.addSuccessor(elseBlock);
                blocks.push(elseBlock);
                processNode(elseNode);
            }
            currentBlock = new faultTreeTypes_1.BasicBlock(`MERGE_${node.startIndex}`);
            blocks.push(currentBlock);
        }
        else if (node.type === "call_expression") {
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
//# sourceMappingURL=astParser.js.map