import { test, assert } from "vitest"
import { renderLitTemplate } from "./lit-ssr-bridge"
import { LitElement, html } from "lit"

// テスト用 LitElement（デコレータ不使用、静的 properties で定義）
class TestCounter extends LitElement {
    static properties = {
        count: { type: Number },
    }

    declare count: number

    constructor() {
        super()
        this.count = 0
    }

    render() {
        return html`<span>${this.count}</span>`
    }
}

if (!customElements.get("test-counter")) {
    customElements.define("test-counter", TestCounter)
}

test("renderLitTemplate: 文字列を返す", async () => {
    const template = html`
        <test-counter></test-counter>
    `
    const result = await renderLitTemplate(template)
    assert.isString(result)
})

test("renderLitTemplate: 出力に shadowrootmode='open' を含む", async () => {
    const template = html`
        <test-counter></test-counter>
    `
    const result = await renderLitTemplate(template)
    assert.include(result, 'shadowrootmode="open"')
})

test("renderLitTemplate: 出力に外側タグを含む", async () => {
    const template = html`
        <test-counter></test-counter>
    `
    const result = await renderLitTemplate(template)
    assert.include(result, "<test-counter")
    assert.include(result, "</test-counter>")
})

test("renderLitTemplate: props がレンダリング結果に反映される", async () => {
    const template = html`<test-counter .count=${42}></test-counter>`
    const result = await renderLitTemplate(template)
    assert.include(result, "42")
})

test("renderLitTemplate: hydration コメントが出力に含まれる", async () => {
    const template = html`
        <test-counter></test-counter>
    `
    const result = await renderLitTemplate(template)
    assert.include(result, "<!--lit-part")
})

test("renderLitTemplate: render() の出力に defer-hydration は自動付与されない", async () => {
    const template = html`
        <test-counter></test-counter>
    `
    const result = await renderLitTemplate(template)
    assert.notInclude(result, "defer-hydration")
})

test("renderLitTemplate: deferHydration: true で defer-hydration 属性が付与される", async () => {
    const template = html`
        <test-counter></test-counter>
    `
    const result = await renderLitTemplate(template, { deferHydration: true })
    assert.include(result, "defer-hydration")
})

test("renderLitTemplate: deferHydration: false で defer-hydration 属性が付与されない", async () => {
    const template = html`
        <test-counter></test-counter>
    `
    const result = await renderLitTemplate(template, { deferHydration: false })
    assert.notInclude(result, "defer-hydration")
})
