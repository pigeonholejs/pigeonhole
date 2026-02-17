// @vitest-environment jsdom
import { test, assert, vi } from "vitest"
import { restoreIslandProps } from "./restore-props"

/**
 * ヘルパー: テスト用 DOM をセットアップする
 */
function setupDom(html: string): void {
    document.body.innerHTML = html
}

test("restoreIslandProps: 単一 island のプロパティを復元する", () => {
    setupDom(`
        <my-counter data-ph-island-id="ph-1"><span>0</span></my-counter>
        <script type="application/json" id="ph-props-ph-1">{"count":5}</script>
    `)

    restoreIslandProps()

    const element = document.querySelector("[data-ph-island-id='ph-1']") as unknown as Record<
        string,
        unknown
    >
    assert.equal(element.count, 5)
})

test("restoreIslandProps: 複数 island のプロパティを復元する", () => {
    setupDom(`
        <my-counter data-ph-island-id="ph-1"></my-counter>
        <script type="application/json" id="ph-props-ph-1">{"count":1}</script>
        <my-counter data-ph-island-id="ph-2"></my-counter>
        <script type="application/json" id="ph-props-ph-2">{"count":2}</script>
    `)

    restoreIslandProps()

    const el1 = document.querySelector("[data-ph-island-id='ph-1']") as unknown as Record<
        string,
        unknown
    >
    const el2 = document.querySelector("[data-ph-island-id='ph-2']") as unknown as Record<
        string,
        unknown
    >
    assert.equal(el1.count, 1)
    assert.equal(el2.count, 2)
})

test("restoreIslandProps: 1 つの失敗で他の復元を止めない", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    setupDom(`
        <my-counter data-ph-island-id="ph-1"></my-counter>
        <script type="application/json" id="ph-props-ph-1">{invalid json}</script>
        <my-counter data-ph-island-id="ph-2"></my-counter>
        <script type="application/json" id="ph-props-ph-2">{"count":2}</script>
    `)

    restoreIslandProps()

    const el2 = document.querySelector("[data-ph-island-id='ph-2']") as unknown as Record<
        string,
        unknown
    >
    assert.equal(el2.count, 2)

    assert.equal(warnSpy.mock.calls.length, 1)
    assert.include(warnSpy.mock.calls[0]?.[0] as string, "failed to restore island props")

    warnSpy.mockRestore()
})

test("restoreIslandProps: 対応する要素がない場合はスキップする", () => {
    setupDom(`
        <script type="application/json" id="ph-props-ph-1">{"count":1}</script>
    `)

    /**
     * エラーが起きないことを確認する
     */
    restoreIslandProps()
})

test("restoreIslandProps: script が空の場合はスキップする", () => {
    setupDom(`
        <my-counter data-ph-island-id="ph-1"></my-counter>
        <script type="application/json" id="ph-props-ph-1"></script>
    `)

    restoreIslandProps()

    const el = document.querySelector("[data-ph-island-id='ph-1']") as unknown as Record<
        string,
        unknown
    >
    assert.isUndefined(el.count)
})

test("restoreIslandProps: 複数プロパティを復元する", () => {
    setupDom(`
        <my-comp data-ph-island-id="ph-1"></my-comp>
        <script type="application/json" id="ph-props-ph-1">{"title":"hello","count":42,"active":true}</script>
    `)

    restoreIslandProps()

    const el = document.querySelector("[data-ph-island-id='ph-1']") as unknown as Record<
        string,
        unknown
    >
    assert.equal(el.title, "hello")
    assert.equal(el.count, 42)
    assert.equal(el.active, true)
})
