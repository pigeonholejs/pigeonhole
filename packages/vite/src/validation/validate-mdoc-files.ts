import { existsSync } from "node:fs"
import { join } from "node:path"
import { normalizePath } from "vite"
import { matchesDenyPattern } from "@pigeonhole/render"
import type { PropsSchema } from "@pigeonhole/render"
import type { MdocFileInfo } from "../scanner/types"

// .mdoc ファイルの import 解決 + 属性検証を行う
export function validateMdocFiles(
    mdocFiles: MdocFileInfo[],
    root: string,
    componentSchemaMap: Map<string, PropsSchema>,
    denyPatterns: string[],
): void {
    for (const page of mdocFiles) {
        // import パスの解決可能性を検証
        for (const importEntry of page.imports) {
            const resolvedPath = normalizePath(join(root, importEntry.path))
            if (!existsSync(resolvedPath)) {
                throw new Error(
                    `import path "${importEntry.path}" in "${page.filePath}" does not resolve to an existing file, expected: "${resolvedPath}"`,
                )
            }
        }

        // 属性の検証
        for (const [tagName, attrNames] of Object.entries(page.tagAttributes)) {
            const schema = componentSchemaMap.get(tagName)
            if (schema) {
                const normalizedKeys = new Set(Object.keys(schema))

                for (const attr of attrNames) {
                    // 未宣言属性の検出
                    if (!normalizedKeys.has(attr)) {
                        throw new Error(
                            `undeclared attribute "${attr}" on tag "${tagName}" in "${page.filePath}" is not defined in component schema`,
                        )
                    }

                    // deny パターンの照合
                    if (matchesDenyPattern(attr, denyPatterns)) {
                        throw new Error(
                            `denied attribute "${attr}" on tag "${tagName}" in "${page.filePath}" matches authorInputPolicy.deny pattern`,
                        )
                    }
                }
            }
        }
    }
}
