import { transformMarkdoc } from "@pigeonhole/markdoc"
import { type Config } from "@markdoc/markdoc"
import { renderToHtml } from "@pigeonhole/render"
import type { RenderOptions } from "@pigeonhole/render"
import type { RenderMdocOptions, RenderPageResult } from "./types"

const MARKDOC_TYPE_MAP: Record<string, BooleanConstructor | NumberConstructor | StringConstructor> = {
    string: String,
    number: Number,
    boolean: Boolean,
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
): Promise<RenderPageResult> {
    const tags: NonNullable<Config["tags"]> = {}
    if (options.components) {
        for (const name of Object.keys(options.components)) {
            const schema = options.propsSchemas?.[name]
            const attributes: Record<string, { type: BooleanConstructor | NumberConstructor | StringConstructor; render?: boolean }> = {}
            if (schema) {
                for (const [key, def] of Object.entries(schema)) {
                    if (key !== "children") {
                        attributes[key] = { type: MARKDOC_TYPE_MAP[def.type] ?? String }
                    }
                }
            }
            // 単純な deny パターン（ワイルドカードなし）を render: false として注入
            if (options.denyPatterns) {
                for (const pattern of options.denyPatterns) {
                    if (!pattern.includes("*")) {
                        attributes[pattern] = { type: String, render: false }
                    }
                }
            }
            tags[name] = { render: name, attributes }
        }
    }
    const tree = transformMarkdoc(source, { tags }, {}, variables)

    const renderOptions: RenderOptions = {
        components: options.components,
        propsSchemas: options.propsSchemas,
        authorAttrsMap: options.authorAttrsMap,
        denyPatterns: options.denyPatterns,
        hydrateComponents: options.hydrateComponents,
        islandTagNames: options.islandTagNames,
    }

    const result = await renderToHtml(tree, renderOptions)

    return {
        html: result.html,
        hasIslands: result.hasIslands,
    }
}
