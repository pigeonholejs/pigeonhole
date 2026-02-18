import { test, assert } from "vitest"
import { Tag, type RenderableTreeNode } from "@markdoc/markdoc"
import { renderToHtml } from "./render"
import type { RenderOptions } from "../types"

/**
 * ヘルパー: Tag を生成する
 */
function tag(
    name: string,
    attributes: Record<string, unknown> = {},
    children: RenderableTreeNode[] = [],
): Tag {
    return new Tag(name, attributes, children)
}

// --- 基本ノード型 ---

test("renderToHtml: null は空文字を返す", async () => {
    const result = await renderToHtml(null)
    assert.equal(result.html, "")
    assert.equal(result.hasIslands, false)
})

test("renderToHtml: boolean は空文字を返す", async () => {
    const result = await renderToHtml(true)
    assert.equal(result.html, "")
    const result2 = await renderToHtml(false)
    assert.equal(result2.html, "")
})

test("renderToHtml: number は文字列化する", async () => {
    const result = await renderToHtml(42)
    assert.equal(result.html, "42")
})

test("renderToHtml: string は HTML エスケープする", async () => {
    const result = await renderToHtml("<b>bold</b>")
    assert.equal(result.html, "&lt;b&gt;bold&lt;/b&gt;")
})

test("renderToHtml: array は各要素を結合する", async () => {
    const result = await renderToHtml(["hello", " ", "world"])
    assert.equal(result.html, "hello world")
})

// --- HTML タグ ---

test("renderToHtml: 通常 HTML タグを出力する", async () => {
    const result = await renderToHtml(tag("p", {}, ["hello"]))
    assert.equal(result.html, "<p>hello</p>")
})

test("renderToHtml: 属性付き HTML タグを出力する", async () => {
    const result = await renderToHtml(tag("div", { class: "container" }, ["content"]))
    assert.equal(result.html, '<div class="container">content</div>')
})

test("renderToHtml: void 要素は閉じタグなし", async () => {
    const result = await renderToHtml(tag("br"))
    assert.equal(result.html, "<br>")
})

test("renderToHtml: void 要素に属性を付与できる", async () => {
    const result = await renderToHtml(tag("img", { src: "test.png", alt: "test" }))
    assert.equal(result.html, '<img src="test.png" alt="test">')
})

test("renderToHtml: ネストしたタグを出力する", async () => {
    const result = await renderToHtml(tag("div", {}, [tag("p", {}, ["text"])]))
    assert.equal(result.html, "<div><p>text</p></div>")
})

// --- SSR のみ（hydrateComponents 未指定 or 空） ---

test("renderToHtml: コンポーネントを SSR のみで描画する", async () => {
    const options: RenderOptions = {
        components: {
            Counter: (props, children) => `<my-counter>${children}</my-counter>`,
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
    }
    const result = await renderToHtml(tag("Counter", { count: 5 }, ["click me"]), options)
    assert.equal(result.html, "<my-counter>click me</my-counter>")
    assert.equal(result.hasIslands, false)
})

test("renderToHtml: hydrateComponents が空なら island markers を付けない", async () => {
    const options: RenderOptions = {
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: {} },
        hydrateComponents: new Map(),
    }
    const result = await renderToHtml(tag("Counter", {}), options)
    assert.notInclude(result.html, "data-ph-island-id")
    assert.equal(result.hasIslands, false)
})

// --- ハイドレーション対象（hydrateComponents に含まれる） ---

test("renderToHtml: hydrateComponents に含まれるコンポーネントに island markers を付ける", async () => {
    const options: RenderOptions = {
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
        hydrateComponents: new Map([["Counter", "eager"]]),
    }
    const result = await renderToHtml(tag("Counter", { count: 0 }), options)
    assert.include(result.html, 'data-ph-island-id="ph-1"')
    assert.include(result.html, "<span>0</span>")
    assert.include(result.html, '<script type="application/json" id="ph-props-ph-1">')
    assert.equal(result.hasIslands, true)
})

test("renderToHtml: hydrateComponents + islandTagNames でカスタム要素名を使う", async () => {
    const options: RenderOptions = {
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
        hydrateComponents: new Map([["Counter", "eager"]]),
        islandTagNames: { Counter: "my-counter" },
    }
    const result = await renderToHtml(tag("Counter", { count: 0 }), options)
    assert.include(result.html, "my-counter")
    assert.include(result.html, 'data-ph-island-id="ph-1"')
})

// --- 非ハイドレーションコンポーネント ---

test("renderToHtml: hydrateComponents に含まれないコンポーネントは markers なし", async () => {
    const options: RenderOptions = {
        components: {
            Header: () => "<header>Header</header>",
        },
        propsSchemas: { Header: {} },
        hydrateComponents: new Map(),
    }
    const result = await renderToHtml(tag("Header", {}), options)
    assert.equal(result.html, "<header>Header</header>")
    assert.notInclude(result.html, "data-ph-island-id")
    assert.equal(result.hasIslands, false)
})

// --- デフォルト動作 ---

test("renderToHtml: hydrateComponents 未指定は SSR のみ", async () => {
    const options: RenderOptions = {
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: {} },
    }
    const result = await renderToHtml(tag("Counter", {}), options)
    assert.notInclude(result.html, "data-ph-island-id")
    assert.equal(result.hasIslands, false)
})

// --- lazy ハイドレーション ---

test("renderToHtml: hydrateComponents に lazy で含まれるコンポーネントに data-ph-hydrate='lazy' を付ける", async () => {
    const options: RenderOptions = {
        components: {
            Slider: () => "<span>slide</span>",
        },
        propsSchemas: { Slider: { index: { type: "number", optional: false } } },
        hydrateComponents: new Map([["Slider", "lazy"]]),
    }
    const result = await renderToHtml(tag("Slider", { index: 0 }), options)
    assert.include(result.html, 'data-ph-hydrate="lazy"')
    assert.include(result.html, 'data-ph-island-id="ph-1"')
    assert.equal(result.hasIslands, true)
})

test("renderToHtml: eager コンポーネントには data-ph-hydrate が付かない", async () => {
    const options: RenderOptions = {
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
        hydrateComponents: new Map([["Counter", "eager"]]),
    }
    const result = await renderToHtml(tag("Counter", { count: 0 }), options)
    assert.notInclude(result.html, "data-ph-hydrate")
    assert.include(result.html, 'data-ph-island-id="ph-1"')
    assert.equal(result.hasIslands, true)
})

// --- filterProps 統合 ---

test("renderToHtml: filterProps でスキーマ外の属性を除外する", async () => {
    let receivedProps: Record<string, unknown> = {}
    const options: RenderOptions = {
        components: {
            Comp: (props) => {
                receivedProps = props
                return "<div></div>"
            },
        },
        propsSchemas: { Comp: { title: { type: "string", optional: false } } },
    }
    await renderToHtml(tag("Comp", { title: "hello", extra: "removed" }), options)
    assert.equal(receivedProps.title, "hello")
    assert.notProperty(receivedProps, "extra")
})

// --- 非同期コンポーネント ---

test("renderToHtml: 非同期コンポーネントを処理する", async () => {
    const options: RenderOptions = {
        components: {
            AsyncComp: async () => {
                return "<p>async result</p>"
            },
        },
        propsSchemas: { AsyncComp: {} },
    }
    const result = await renderToHtml(tag("AsyncComp", {}), options)
    assert.equal(result.html, "<p>async result</p>")
})
