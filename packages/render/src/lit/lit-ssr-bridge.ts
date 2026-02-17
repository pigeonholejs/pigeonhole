import "@lit-labs/ssr/lib/install-global-dom-shim.js"
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js"
import { collectResult } from "@lit-labs/ssr/lib/render-result.js"
import type { ServerComponent } from "../types"

/**
 * LitElement クラスを ServerComponent 関数に変換するブリッジ
 *
 * LitElementRenderer を使用して Shadow DOM コンテンツを
 * Declarative Shadow DOM (`<template shadowrootmode="open">`) として出力する。
 */
export function createLitBridge(
    elementClass: typeof HTMLElement,
    tagName: string,
): ServerComponent {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, elementClass)
    }

    return async (props, _children): Promise<string> => {
        const renderer = new LitElementRenderer(tagName)

        for (const [key, value] of Object.entries(props)) {
            if (key !== "children") {
                renderer.setProperty(key, value)
            }
        }

        renderer.connectedCallback()

        const renderInfo = {
            elementRenderers: [LitElementRenderer],
            customElementInstanceStack: [],
            customElementHostStack: [],
            eventTargetStack: [],
            slotStack: [],
            deferHydration: false,
        }
        const shadowContents = renderer.renderShadow(renderInfo)
        if (shadowContents === undefined) return ""

        const innerHtml = await collectResult(shadowContents)
        return `<template shadowrootmode="open">${innerHtml}</template>`
    }
}
