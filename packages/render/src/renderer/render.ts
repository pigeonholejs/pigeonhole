import { Tag, type RenderableTreeNode } from "@markdoc/markdoc"
import { filterProps } from "../props/index"
import {
    createRenderContext,
    generateIslandId,
    wrapIslandHtml,
    serializeIslandProps,
} from "../island/island-marker"
import type { RenderContext } from "../island/island-marker"
import { escapeHtml } from "./escape"
import { serializeAttributes } from "./serialize-attributes"
import type { RenderOptions, RenderResult } from "../types"

// HTML void 要素のセット
// https://html.spec.whatwg.org/multipage/syntax.html#void-elements
const VOID_ELEMENTS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
])

/** 単一ノードをレンダリングする */
async function renderNode(
    node: RenderableTreeNode,
    options: RenderOptions,
    context: { hasIslands: boolean },
    renderCtx: RenderContext,
): Promise<string> {
    if (node === null || node === undefined || typeof node === "boolean") {
        return ""
    }

    if (typeof node === "number") {
        return String(node)
    }

    if (typeof node === "string") {
        return escapeHtml(node)
    }

    if (Array.isArray(node)) {
        const results: string[] = []
        for (const child of node) {
            results.push(await renderNode(child, options, context, renderCtx))
        }
        return results.join("")
    }

    if (Tag.isTag(node)) {
        return renderTag(node, options, context, renderCtx)
    }

    return ""
}

/** children をレンダリングする */
async function renderChildren(
    children: RenderableTreeNode[],
    options: RenderOptions,
    context: { hasIslands: boolean },
    renderCtx: RenderContext,
): Promise<string> {
    const results: string[] = []
    for (const child of children) {
        results.push(await renderNode(child, options, context, renderCtx))
    }
    return results.join("")
}

/**
 * Tag ノードをレンダリングする
 *
 * モード分岐:
 * - ssr: component 呼び出し → componentHtml 返却
 * - csr: 空 shell + props script（component 関数は呼び出さない）
 * - hydration: component 呼び出し → wrapIslandHtml（全コンポーネントを island 扱い）
 * - island: island 指定のみ wrapIslandHtml、それ以外は componentHtml
 */
async function renderTag(
    tag: Tag,
    options: RenderOptions,
    context: { hasIslands: boolean },
    renderCtx: RenderContext,
): Promise<string> {
    const { name, attributes, children } = tag
    const component = options.components?.[name]
    const mode = options.mode ?? "island"

    // カスタムコンポーネントの解決
    if (component) {
        const childrenHtml = await renderChildren(children, options, context, renderCtx)

        // props schema に基づく allow-list フィルタ（未提供時は空 schema＝全属性拒否）
        const effectiveSchema = options.propsSchemas?.[name] ?? {}
        const authorAttrs = options.authorAttrsMap?.[name] ?? new Set()
        const sanitized = filterProps({
            attrs: attributes,
            schema: effectiveSchema,
            authorAttrs,
            denyPatterns: options.denyPatterns ?? [],
            renderedChildren: childrenHtml,
        })

        // モード別レンダリング
        if (mode === "ssr") {
            // ssr: component 呼び出し → componentHtml 返却（markers なし）
            const componentHtml = await component(
                sanitized,
                (sanitized.children as string) ?? childrenHtml,
            )
            return componentHtml
        }

        if (mode === "csr") {
            // csr: 空 shell + props script（component 関数は呼び出さない）
            context.hasIslands = true
            const islandId = generateIslandId(renderCtx)
            const ceTagName = options.islandTagNames?.[name] ?? name
            const propsScript = serializeIslandProps(islandId, sanitized)
            return `<${ceTagName} data-ph-island-id="${islandId}"></${ceTagName}>${propsScript}`
        }

        if (mode === "hydration") {
            // hydration: 全コンポーネントを island 扱い → SSR + island markers
            context.hasIslands = true
            const islandId = generateIslandId(renderCtx)
            const ceTagName = options.islandTagNames?.[name] ?? name
            const isCustomElement = options.islandTagNames?.[name] !== undefined
            const componentHtml = await component(
                sanitized,
                (sanitized.children as string) ?? childrenHtml,
            )
            return wrapIslandHtml(islandId, ceTagName, componentHtml, sanitized, {
                deferHydration: isCustomElement,
            })
        }

        // island: island 指定コンポーネントのみ SSR + markers、それ以外は SSR のみ
        const componentHtml = await component(
            sanitized,
            (sanitized.children as string) ?? childrenHtml,
        )
        if (options.islandComponents?.has(name)) {
            context.hasIslands = true
            const islandId = generateIslandId(renderCtx)
            const ceTagName = options.islandTagNames?.[name] ?? name
            const isCustomElement = options.islandTagNames?.[name] !== undefined
            return wrapIslandHtml(islandId, ceTagName, componentHtml, sanitized, {
                deferHydration: isCustomElement,
            })
        }
        return componentHtml
    }

    // 通常 HTML タグのレンダリング
    const attrs = serializeAttributes(attributes)

    if (VOID_ELEMENTS.has(name)) {
        return `<${name}${attrs}>`
    }

    const childrenHtml = await renderChildren(children, options, context, renderCtx)
    return `<${name}${attrs}>${childrenHtml}</${name}>`
}

/**
 * Markdoc の RenderableTreeNode を HTML に変換する
 */
export async function renderToHtml(
    node: RenderableTreeNode,
    options: RenderOptions = {},
): Promise<RenderResult> {
    const renderCtx = createRenderContext()
    const context = { hasIslands: false }
    const html = await renderNode(node, options, context, renderCtx)
    return { html, hasIslands: context.hasIslands }
}
