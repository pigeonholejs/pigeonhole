import { test, assert } from "vitest"
import { createLitBridge } from "../lit-ssr-bridge"
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

// 全テストで同一のブリッジを共有（customElements 二重登録を回避）
const bridge = createLitBridge(TestCounter, "test-counter")

test("createLitBridge: ServerComponent 型の関数を返す", () => {
    assert.isFunction(bridge)
})

test("createLitBridge: 出力に shadowrootmode='open' を含む", async () => {
    const result = await bridge({}, "")
    assert.include(result, '<template shadowrootmode="open">')
})

test("createLitBridge: props がレンダリング結果に反映される", async () => {
    const result = await bridge({ count: 42 }, "")
    assert.include(result, "42")
})

test("createLitBridge: children は無視される", async () => {
    const result = await bridge({ count: 0, children: "<p>ignored</p>" }, "")
    assert.notInclude(result, "ignored")
})
