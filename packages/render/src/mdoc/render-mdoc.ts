import { transformMarkdoc } from "@pigeonhole/markdoc"
import { type Config } from "markdecl"
import { renderToHtml } from "../html/render-to-html"
import { matchesDenyPattern } from "../props/deny-pattern"
import type { RenderOptions, RenderMdocOptions, RenderResult } from "../types"

const MARKDOC_TYPE_MAP: Record<string, BooleanConstructor | NumberConstructor | StringConstructor> =
    {
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
): Promise<RenderResult> {
    const tags: NonNullable<Config["tags"]> = {}
    if (options.components) {
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
            // 非ワイルドカード deny: スキーマ未宣言でも markdecl に通知（現状維持）
            if (options.denyPatterns) {
                for (const pattern of options.denyPatterns) {
                    if (!pattern.includes("*") && !(pattern in attributes)) {
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
        hydrateComponents: options.hydrateComponents,
        islandTagNames: options.islandTagNames,
    }

    const result = await renderToHtml(tree, renderOptions)

    return {
        html: result.html,
        hasIslands: result.hasIslands,
    }
}
