import { existsSync } from "node:fs"
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path"
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

const RESERVED_MDOC_TAG_NAME = "Children"
const PASCAL_CASE_NAME = /^[A-Z][A-Za-z0-9]*$/

type MdocImportMap = Map<string, MdocFileInfo>

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

function stripQueryAndHash(specifier: string): string {
    return specifier.split(/[?#]/)[0]
}

function isMdocSpecifier(specifier: string): boolean {
    return extname(stripQueryAndHash(specifier)) === ".mdoc"
}

function resolveImportPath(root: string, importerFilePath: string, specifier: string): string {
    const cleanSpecifier = stripQueryAndHash(specifier)

    if (isAbsolute(cleanSpecifier)) {
        return normalizePath(cleanSpecifier)
    }
    if (cleanSpecifier.startsWith("/")) {
        return normalizePath(join(root, cleanSpecifier))
    }
    if (cleanSpecifier.startsWith(".")) {
        return normalizePath(resolve(dirname(importerFilePath), cleanSpecifier))
    }

    return normalizePath(join(root, cleanSpecifier))
}

function deriveMdocTagNameFromSpecifier(specifier: string, importerPath: string): string {
    const cleanSpecifier = stripQueryAndHash(specifier)
    const tagName = basename(cleanSpecifier, ".mdoc")

    if (!PASCAL_CASE_NAME.test(tagName)) {
        throw new Error(
            `mdoc import "${specifier}" in "${importerPath}" must use a PascalCase file name (e.g. "TimelineLayout.mdoc")`,
        )
    }

    return tagName
}

function detectMdocImportCycles(edges: Map<string, string[]>): void {
    const state = new Map<string, "visiting" | "visited">()
    const stack: string[] = []

    const visit = (filePath: string): void => {
        const currentState = state.get(filePath)
        if (currentState === "visiting") {
            const cycleStartIndex = stack.indexOf(filePath)
            const cycle = [...stack.slice(cycleStartIndex), filePath]
            throw new Error(`circular mdoc import detected: ${cycle.join(" -> ")}`)
        }
        if (currentState === "visited") {
            return
        }

        state.set(filePath, "visiting")
        stack.push(filePath)
        for (const child of edges.get(filePath) ?? []) {
            visit(child)
        }
        stack.pop()
        state.set(filePath, "visited")
    }

    for (const filePath of edges.keys()) {
        visit(filePath)
    }
}

function buildMdocImportMaps(
    mdocFiles: MdocFileInfo[],
    root: string,
    knownPackageImports: Set<string>,
    componentSchemaMap: Map<string, PropsSchema>,
): Map<string, MdocImportMap> {
    const mdocByPath = new Map<string, MdocFileInfo>(
        mdocFiles.map((file) => [normalizePath(file.filePath), file] as [string, MdocFileInfo]),
    )
    const importsByFilePath = new Map<string, MdocImportMap>()
    const edges = new Map<string, string[]>()

    for (const page of mdocFiles) {
        const currentFilePath = normalizePath(page.filePath)
        const importedMdocs = new Map<string, MdocFileInfo>()
        const currentEdges: string[] = []

        for (const importEntry of page.imports) {
            if (isBareImportSpecifier(importEntry.path)) {
                if (!matchesKnownPackageImport(importEntry.path, knownPackageImports)) {
                    throw new Error(
                        `import path "${importEntry.path}" in "${page.filePath}" is a bare specifier but is not declared in componentRegistries`,
                    )
                }
                continue
            }

            const resolvedPath = resolveImportPath(root, currentFilePath, importEntry.path)
            if (!existsSync(resolvedPath)) {
                throw new Error(
                    `import path "${importEntry.path}" in "${page.filePath}" does not resolve to an existing file, expected: "${resolvedPath}"`,
                )
            }

            if (!isMdocSpecifier(importEntry.path)) {
                continue
            }

            const tagName = deriveMdocTagNameFromSpecifier(importEntry.path, page.filePath)
            if (componentSchemaMap.has(tagName)) {
                throw new Error(
                    `mdoc import tag "${tagName}" in "${page.filePath}" conflicts with registered component tag "${tagName}"`,
                )
            }

            const existingImport = importedMdocs.get(tagName)
            if (existingImport) {
                throw new Error(
                    `duplicate mdoc import tag "${tagName}" in "${page.filePath}". Rename one of the imported files to avoid a tag collision`,
                )
            }

            const importedMdoc = mdocByPath.get(resolvedPath)
            if (!importedMdoc) {
                throw new Error(
                    `mdoc import path "${importEntry.path}" in "${page.filePath}" must point to a file under mdocDir`,
                )
            }

            importedMdocs.set(tagName, importedMdoc)
            currentEdges.push(resolvedPath)
        }

        importsByFilePath.set(currentFilePath, importedMdocs)
        edges.set(currentFilePath, currentEdges)
    }

    detectMdocImportCycles(edges)
    return importsByFilePath
}

function isPascalCaseTag(tagName: string): boolean {
    return PASCAL_CASE_NAME.test(tagName)
}

function childMdocAcceptsChildren(mdocFile: MdocFileInfo): boolean {
    return RESERVED_MDOC_TAG_NAME in mdocFile.tagUsages
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
    const importedMdocsByFilePath = buildMdocImportMaps(
        mdocFiles,
        root,
        knownPackageImports,
        componentSchemaMap,
    )

    for (const page of mdocFiles) {
        // 属性の検証
        const importedMdocs: MdocImportMap =
            importedMdocsByFilePath.get(normalizePath(page.filePath)) ??
            new Map<string, MdocFileInfo>()
        for (const [tagName, usage] of Object.entries(page.tagUsages)) {
            if (tagName === RESERVED_MDOC_TAG_NAME) {
                continue
            }

            const importedMdoc = importedMdocs.get(tagName)
            if (importedMdoc) {
                const allowedInputNames = new Set(
                    importedMdoc.inputs.map((input) => input.variableName),
                )
                for (const attr of usage.attributes) {
                    if (!allowedInputNames.has(attr)) {
                        throw new Error(
                            `undeclared attribute "${attr}" on mdoc tag "${tagName}" in "${page.filePath}" is not defined in "${importedMdoc.filePath}" input frontmatter`,
                        )
                    }
                }

                if (usage.hasChildren && !childMdocAcceptsChildren(importedMdoc)) {
                    throw new Error(
                        `mdoc tag "${tagName}" in "${page.filePath}" is used with children, but "${importedMdoc.filePath}" does not include "{% Children /%}"`,
                    )
                }
                continue
            }

            const schema = componentSchemaMap.get(tagName)
            if (schema) {
                const normalizedKeys = new Set(Object.keys(schema))
                const contract = componentContracts.get(tagName)

                if (contract) {
                    for (const [attributeName, attribute] of Object.entries(contract.attributes)) {
                        if (attribute.required && !usage.attributes.includes(attributeName)) {
                            throw new Error(
                                `required attribute "${attributeName}" on tag "${tagName}" in "${page.filePath}" is missing`,
                            )
                        }
                    }
                }

                for (const attr of usage.attributes) {
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
                continue
            }

            if (isPascalCaseTag(tagName)) {
                throw new Error(
                    `tag "${tagName}" in "${page.filePath}" is not imported as mdoc and not registered in component schema`,
                )
            }
        }
    }
}
