import { test, assert } from "vitest"
import {
    createRenderContext,
    generateIslandId,
    serializeIslandProps,
    wrapIslandHtml,
} from "./marker"

test("generateIslandId: 連番 ID を生成する", () => {
    const ctx = createRenderContext()
    assert.equal(generateIslandId(ctx), "ph-1")
    assert.equal(generateIslandId(ctx), "ph-2")
    assert.equal(generateIslandId(ctx), "ph-3")
})

test("createRenderContext: 新しいコンテキストはカウンターを 0 から開始する", () => {
    const ctx1 = createRenderContext()
    generateIslandId(ctx1)
    generateIslandId(ctx1)

    const ctx2 = createRenderContext()
    assert.equal(generateIslandId(ctx2), "ph-1")
})

test("createRenderContext: 並行リクエストでも ID が重複しない", () => {
    const ctx1 = createRenderContext()
    const ctx2 = createRenderContext()

    const id1a = generateIslandId(ctx1)
    const id2a = generateIslandId(ctx2)
    const id1b = generateIslandId(ctx1)
    const id2b = generateIslandId(ctx2)

    assert.equal(id1a, "ph-1")
    assert.equal(id2a, "ph-1")
    assert.equal(id1b, "ph-2")
    assert.equal(id2b, "ph-2")
})

test("serializeIslandProps: JSON script タグを生成する", () => {
    const result = serializeIslandProps("ph-1", { title: "hello" })
    assert.equal(
        result,
        '<script type="application/json" id="ph-props-ph-1">{"title":"hello"}</script>',
    )
})

test("serializeIslandProps: children を除外する", () => {
    const result = serializeIslandProps("ph-1", { title: "hello", children: "<p>child</p>" })
    assert.equal(
        result,
        '<script type="application/json" id="ph-props-ph-1">{"title":"hello"}</script>',
    )
})

test("serializeIslandProps: < を \\u003c にエスケープする", () => {
    const result = serializeIslandProps("ph-1", { content: "<script>" })
    assert.include(result, "\\u003cscript>")
    assert.notInclude(result, '"<script>"')
})

test("serializeIslandProps: シリアライズ不可な props でエラーを投げる", () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    assert.throws(() => serializeIslandProps("ph-1", circular), /failed to serialize island props/)
})

// --- wrapIslandHtml: 注入方式（Lit コンポーネント）---

test("wrapIslandHtml: 外側タグを含む HTML に data-island-id を注入する", () => {
    const islandHtml =
        '<my-counter defer-hydration><template shadowrootmode="open"><span>0</span></template></my-counter>'
    const result = wrapIslandHtml("ph-1", "my-counter", islandHtml, { count: 0 })
    assert.include(result, 'data-ph-island-id="ph-1"')
    assert.include(result, "<my-counter")
    assert.include(result, "</my-counter>")
    assert.include(
        result,
        '<script type="application/json" id="ph-props-ph-1">{"count":0}</script>',
    )
})

test("wrapIslandHtml: 開始タグの最初の出現箇所に属性を注入する", () => {
    const islandHtml = "<my-counter><template></template></my-counter>"
    const result = wrapIslandHtml("ph-1", "my-counter", islandHtml, {})
    assert.equal(
        result,
        '<my-counter data-ph-island-id="ph-1"><template></template></my-counter><script type="application/json" id="ph-props-ph-1">{}</script>',
    )
})

// --- wrapIslandHtml: ラップ方式（関数コンポーネント）---

test("wrapIslandHtml: 外側タグを含まない HTML はラップする", () => {
    const result = wrapIslandHtml("ph-1", "my-counter", "<span>0</span>", { count: 0 })
    assert.equal(
        result,
        '<my-counter data-ph-island-id="ph-1"><span>0</span></my-counter><script type="application/json" id="ph-props-ph-1">{"count":0}</script>',
    )
})

// --- wrapIslandHtml: lazy ハイドレーション ---

test("wrapIslandHtml: lazy モードで data-ph-hydrate='lazy' が注入される", () => {
    const islandHtml = "<my-counter><template></template></my-counter>"
    const result = wrapIslandHtml("ph-1", "my-counter", islandHtml, { count: 0 }, "lazy")
    assert.include(result, 'data-ph-hydrate="lazy"')
    assert.include(result, 'data-ph-island-id="ph-1"')
})

test("wrapIslandHtml: eager モード（デフォルト）では data-ph-hydrate が付かない", () => {
    const islandHtml = "<my-counter><template></template></my-counter>"
    const result = wrapIslandHtml("ph-1", "my-counter", islandHtml, { count: 0 })
    assert.notInclude(result, "data-ph-hydrate")
})

test("wrapIslandHtml: lazy モードのラップ方式でも data-ph-hydrate が付く", () => {
    const result = wrapIslandHtml("ph-1", "my-counter", "<span>0</span>", { count: 0 }, "lazy")
    assert.include(result, 'data-ph-hydrate="lazy"')
    assert.include(result, 'data-ph-island-id="ph-1"')
})

// --- wrapIslandHtml: client-only ハイドレーション ---

test("wrapIslandHtml: client-only モードで data-ph-hydrate='client-only' が注入される", () => {
    const islandHtml = "<my-counter><template></template></my-counter>"
    const result = wrapIslandHtml("ph-1", "my-counter", islandHtml, { count: 0 }, "client-only")
    assert.include(result, 'data-ph-hydrate="client-only"')
    assert.include(result, 'data-ph-island-id="ph-1"')
})

test("wrapIslandHtml: client-only モードのラップ方式でも data-ph-hydrate が付く", () => {
    const result = wrapIslandHtml("ph-1", "my-counter", "", { count: 0 }, "client-only")
    assert.include(result, 'data-ph-hydrate="client-only"')
    assert.include(result, 'data-ph-island-id="ph-1"')
})

test("wrapIslandHtml: props JSON スクリプトが末尾に追加される", () => {
    const islandHtml = "<my-widget>content</my-widget>"
    const result = wrapIslandHtml("ph-1", "my-widget", islandHtml, { title: "test" })
    assert.isTrue(result.endsWith("</script>"))
    assert.include(result, '"title":"test"')
})
