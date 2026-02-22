import { existsSync } from "node:fs"
import { join } from "node:path"
import { normalizePath } from "vite"
import { matchesDenyPattern } from "@pigeonhole/contracts"
import type { PropsSchema } from "@pigeonhole/contracts"
import type { MdocFileInfo } from "../mdoc/types"
import type { ComponentContract } from "../registry/types"

export interface ValidateMdocFilesOptions {
    knownPackageImports?: Set<string>
    componentContracts?: Map<string, ComponentContract>
    strictComplexTypes?: boolean
}

function isBareImportSpecifier(specifier: string): boolean {
    if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("\\")) {
        return false
    }

    // "src/components/Card.tsx" のような project-root からのファイル指定は bare 扱いにしない
    if (specifier.startsWith("src/") || /\.[A-Za-z0-9]+($|\?)/.test(specifier)) {
        return false
    }

    return !/^[A-Za-z]:[\\/]/.test(specifier)
}

function matchesKnownPackageImport(specifier: string, knownPackages: Set<string>): boolean {
    for (const packageName of knownPackages) {
        if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
            return true
        }
    }
    return false
}

// .mdoc ファイルの import 解決 + 属性検証を行う
export function validateMdocFiles(
    mdocFiles: MdocFileInfo[],
    root: string,
    componentSchemaMap: Map<string, PropsSchema>,
    denyPatterns: string[],
    options: ValidateMdocFilesOptions = {},
): void {
    const knownPackageImports = options.knownPackageImports ?? new Set<string>()
    const componentContracts = options.componentContracts ?? new Map<string, ComponentContract>()
    const strictComplexTypes = options.strictComplexTypes ?? false

    for (const page of mdocFiles) {
        // import パスの解決可能性を検証
        for (const importEntry of page.imports) {
            if (isBareImportSpecifier(importEntry.path)) {
                if (!matchesKnownPackageImport(importEntry.path, knownPackageImports)) {
                    throw new Error(
                        `import path "${importEntry.path}" in "${page.filePath}" is a bare specifier but is not declared in componentRegistries`,
                    )
                }
                continue
            }

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
                const contract = componentContracts.get(tagName)

                if (contract) {
                    for (const [attributeName, attribute] of Object.entries(contract.attributes)) {
                        if (attribute.required && !attrNames.includes(attributeName)) {
                            throw new Error(
                                `required attribute "${attributeName}" on tag "${tagName}" in "${page.filePath}" is missing`,
                            )
                        }
                    }
                }

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

                    if (strictComplexTypes && contract) {
                        const type = contract.attributes[attr]?.type
                        if (
                            type &&
                            (type.kind === "complex" ||
                                type.kind === "reference" ||
                                type.kind === "unknown")
                        ) {
                            throw new Error(
                                `attribute "${attr}" on tag "${tagName}" in "${page.filePath}" has non-primitive CEM type "${type.rawText}" and strictComplexTypes is enabled`,
                            )
                        }
                    }
                }
            }
        }
    }
}
