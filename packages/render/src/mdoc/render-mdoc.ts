import { filterFrontmatter, parse, transformMarkdoc } from "@pigeonhole/markdoc"
import { matchesDenyPattern } from "@pigeonhole/contracts"
import { type Config, type RenderableTreeNode } from "strictmdoc"
import { renderToHtml } from "../html/render-to-html"
import type {
    MdocImportResolver,
    MdocSlotChildren,
    RenderOptions,
    RenderMdocOptions,
    RenderResult,
} from "../types"

const MARKDOC_TYPE_MAP: Record<string, BooleanConstructor | NumberConstructor | StringConstructor> =
    {
        string: String,
        number: Number,
        boolean: Boolean,
    }
const RESERVED_CHILDREN_TAG = "Children"
const INTERNAL_CHILDREN_VARIABLE = "__pigeonhole_children"
const PASCAL_CASE_NAME = /^[A-Z][A-Za-z0-9]*$/

type LoadedMdocModule = {
    id: string
    source: string
    importedMdocs: Array<{ tagName: string; moduleId: string }>
    inputNames: string[]
}

function stripQueryAndHash(specifier: string): string {
    return specifier.split(/[?#]/)[0]
}

function isMdocSpecifier(specifier: string): boolean {
    return stripQueryAndHash(specifier).endsWith(".mdoc")
}

function toPascalCaseTagName(specifier: string): string {
    const cleanSpecifier = stripQueryAndHash(specifier)
    const fileName = cleanSpecifier.split(/[\\/]/).pop() ?? cleanSpecifier
    const withoutExtension = fileName.replace(/\.mdoc$/u, "")
    if (!PASCAL_CASE_NAME.test(withoutExtension)) {
        throw new Error(
            `mdoc import "${specifier}" must use a PascalCase file name (e.g. "TimelineLayout.mdoc")`,
        )
    }
    return withoutExtension
}

function buildComponentTags(options: RenderMdocOptions): NonNullable<Config["tags"]> {
    const tags: NonNullable<Config["tags"]> = {}
    if (!options.components) {
        return tags
    }

    for (const name of Object.keys(options.components)) {
        const schema = options.propsSchemas?.[name]
        const attributes: Record<
            string,
            {
                type: BooleanConstructor | NumberConstructor | StringConstructor
                render?: boolean
            }
        > = {}
        if (schema) {
            for (const [key, def] of Object.entries(schema)) {
                if (key !== "children") {
                    if (matchesDenyPattern(key, options.denyPatterns ?? [])) {
                        attributes[key] = {
                            type: MARKDOC_TYPE_MAP[def.type] ?? String,
                            render: false,
                        }
                    } else {
                        attributes[key] = { type: MARKDOC_TYPE_MAP[def.type] ?? String }
                    }
                }
            }
        }
        // 非ワイルドカード deny: スキーマ未宣言でも strictmdoc に通知（現状維持）
        if (options.denyPatterns) {
            for (const pattern of options.denyPatterns) {
                if (!pattern.includes("*") && !(pattern in attributes)) {
                    attributes[pattern] = { type: String, render: false }
                }
            }
        }
        tags[name] = { render: name, attributes: { ...attributes, slot: { type: String } } }
    }

    return tags
}

async function loadMdocModules(
    source: string,
    sourcePath: string | undefined,
    resolveImport: MdocImportResolver | undefined,
    componentTagNames: Set<string>,
): Promise<Map<string, LoadedMdocModule>> {
    const modules = new Map<string, LoadedMdocModule>()
    const visiting = new Set<string>()
    const rootId = sourcePath ?? "__root__.mdoc"

    const visit = async (moduleId: string, moduleSource: string): Promise<void> => {
        if (visiting.has(moduleId)) {
            throw new Error(`circular mdoc import detected while loading "${moduleId}"`)
        }
        if (modules.has(moduleId)) {
            return
        }

        visiting.add(moduleId)

        const ast = parse(moduleSource)
        const frontmatter = filterFrontmatter(ast)
        const inputNames = (frontmatter.inputs ?? []).map((input) => input.variableName)
        const importedMdocs: Array<{ tagName: string; moduleId: string }> = []
        const seenTagNames = new Set<string>()

        for (const importEntry of frontmatter.imports ?? []) {
            if (!isMdocSpecifier(importEntry.path)) {
                continue
            }

            if (!resolveImport) {
                throw new Error(
                    `mdoc import "${importEntry.path}" in "${moduleId}" requires options.mdoc.resolveImport`,
                )
            }

            const tagName = toPascalCaseTagName(importEntry.path)
            if (componentTagNames.has(tagName)) {
                throw new Error(
                    `mdoc import tag "${tagName}" in "${moduleId}" conflicts with registered component tag`,
                )
            }
            if (tagName === RESERVED_CHILDREN_TAG) {
                throw new Error(
                    `mdoc import "${importEntry.path}" in "${moduleId}" cannot use reserved tag name "${RESERVED_CHILDREN_TAG}"`,
                )
            }
            if (seenTagNames.has(tagName)) {
                throw new Error(
                    `duplicate mdoc import tag "${tagName}" in "${moduleId}". Rename one imported file to avoid collision`,
                )
            }
            seenTagNames.add(tagName)

            const resolved = await resolveImport(importEntry.path, moduleId)
            if (!resolved) {
                throw new Error(
                    `failed to resolve mdoc import "${importEntry.path}" from "${moduleId}"`,
                )
            }

            importedMdocs.push({ tagName, moduleId: resolved.id })
            await visit(resolved.id, resolved.source)
        }

        modules.set(moduleId, {
            id: moduleId,
            source: moduleSource,
            importedMdocs,
            inputNames,
        })
        visiting.delete(moduleId)
    }

    await visit(rootId, source)
    return modules
}

function toChildrenArray(value: MdocSlotChildren): RenderableTreeNode[] {
    if (value == null) {
        return []
    }
    return Array.isArray(value) ? value : [value]
}

/**
 * Markdoc ソース文字列を HTML にレンダリングする
 *
 * @param source - Markdoc ソース文字列
 * @param variables - テンプレート変数
 * @param options - レンダリングオプション
 * @returns レンダリング結果（html, hasIslands）
 */
export async function renderMdoc(
    source: string,
    variables: Record<string, unknown>,
    options: RenderMdocOptions = {},
): Promise<RenderResult> {
    const componentTags = buildComponentTags(options)
    const componentTagNames = new Set(Object.keys(componentTags))
    const modules = await loadMdocModules(
        source,
        options.mdoc?.sourcePath,
        options.mdoc?.resolveImport,
        componentTagNames,
    )
    const rootId = options.mdoc?.sourcePath ?? "__root__.mdoc"

    const renderModule = (
        moduleId: string,
        scopedVariables: Record<string, unknown>,
        slotChildren: MdocSlotChildren,
        stack: string[],
    ): RenderableTreeNode => {
        if (stack.includes(moduleId)) {
            throw new Error(`circular mdoc import detected: ${[...stack, moduleId].join(" -> ")}`)
        }

        const module = modules.get(moduleId)
        if (!module) {
            throw new Error(`mdoc module "${moduleId}" was not loaded`)
        }

        const tags: NonNullable<Config["tags"]> = { ...componentTags }
        tags[RESERVED_CHILDREN_TAG] = {
            selfClosing: true,
            transform(_node, config) {
                const childrenValue = config.variables?.[
                    INTERNAL_CHILDREN_VARIABLE
                ] as MdocSlotChildren
                return toChildrenArray(childrenValue)
            },
        }

        for (const imported of module.importedMdocs) {
            const childModule = modules.get(imported.moduleId)
            if (!childModule) {
                throw new Error(
                    `mdoc module "${imported.moduleId}" imported by "${module.id}" was not loaded`,
                )
            }

            const attributes: Record<string, { type: ObjectConstructor }> = {}
            for (const inputName of childModule.inputNames) {
                attributes[inputName] = { type: Object }
            }

            tags[imported.tagName] = {
                attributes,
                transform(node, config) {
                    const inheritedVariables = (config.variables ?? {}) as Record<string, unknown>
                    const childVariables = {
                        ...inheritedVariables,
                        ...node.attributes,
                    }
                    const childSlotChildren = node.transformChildren(config) as MdocSlotChildren
                    return renderModule(imported.moduleId, childVariables, childSlotChildren, [
                        ...stack,
                        moduleId,
                    ])
                },
            }
        }

        return transformMarkdoc(
            module.source,
            { tags },
            {},
            {
                ...scopedVariables,
                [INTERNAL_CHILDREN_VARIABLE]: slotChildren,
            },
        )
    }

    const tree = renderModule(rootId, variables, null, [])

    const renderOptions: RenderOptions = {
        components: options.components,
        hydrateComponents: options.hydrateComponents,
        islandTagNames: options.islandTagNames,
    }

    const result = await renderToHtml(tree, renderOptions)

    return {
        html: result.html,
        hasIslands: result.hasIslands,
    }
}
