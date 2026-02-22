import { Tag } from "strictmdoc"
import type { RenderableTreeNode } from "strictmdoc"

import { createRenderContext, generateIslandId, wrapIslandHtml } from "../island/marker"
import type { RenderContext } from "../types"
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
 * hydrateComponents に含まれるコンポーネントは SSR + island markers、
 * それ以外は SSR のみ。
 */
async function renderTag(
    tag: InstanceType<typeof Tag>,
    options: RenderOptions,
    context: { hasIslands: boolean },
    renderCtx: RenderContext,
): Promise<string> {
    const { name, attributes, children } = tag
    const component = options.components?.[name]

    // カスタムコンポーネントの解決
    if (component) {
        const childrenHtml = await renderChildren(children, options, context, renderCtx)

        const hydrateMode = options.hydrateComponents?.get(name)

        if (hydrateMode === "client-only") {
            // client-only: SSR を行わず空プレースホルダー + props JSON を出力
            context.hasIslands = true
            const islandId = generateIslandId(renderCtx)
            const ceTagName = options.islandTagNames?.[name] ?? name
            return wrapIslandHtml(islandId, ceTagName, "", attributes, hydrateMode)
        }

        const componentHtml = await component(attributes, childrenHtml)

        if (hydrateMode) {
            // eager/lazy: SSR + hydration markers
            context.hasIslands = true
            const islandId = generateIslandId(renderCtx)
            const ceTagName = options.islandTagNames?.[name] ?? name
            return wrapIslandHtml(islandId, ceTagName, componentHtml, attributes, hydrateMode)
        }

        // none (default): SSR only
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
