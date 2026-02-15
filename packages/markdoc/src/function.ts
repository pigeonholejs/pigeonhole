import { type Node } from "@markdoc/markdoc"

const MARKDOC_BUILTIN_FUNCTIONS = ["and", "or", "not", "equals", "default", "debug"]

function isFunction(
    value: unknown,
): value is { $$mdtype: "Function"; name: string; parameters: Record<string, unknown> } {
    return (
        typeof value === "object" &&
        value !== null &&
        "$$mdtype" in value &&
        (value as Record<string, unknown>).$$mdtype === "Function"
    )
}

function collectFunctionNames(node: Node): string[] {
    const names: string[] = []
    for (const value of Object.values(node.attributes)) {
        if (isFunction(value)) {
            names.push(value.name)
        }
    }
    for (const child of node.children) {
        names.push(...collectFunctionNames(child))
    }
    return names
}

/**
 * AST内の許可されていない関数呼び出しを検出しエラーをスローする。
 * @param ast - MarkdocのパースされたASTノード
 * @param allowlist - 許可する関数名のリスト（デフォルト: Markdoc組み込み関数）
 * @throws 許可されていない関数が使用されている場合にErrorをスロー
 */
export function rejectFunctions(ast: Node, allowlist: string[] = MARKDOC_BUILTIN_FUNCTIONS): void {
    const used = collectFunctionNames(ast)
    const denied = used.filter((name) => !allowlist.includes(name))
    if (denied.length > 0) {
        throw new Error(`Markdoc functions are not allowed: ${denied.join(", ")}`)
    }
}
