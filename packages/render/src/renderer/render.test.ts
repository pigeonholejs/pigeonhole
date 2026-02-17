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

// --- ssr モード ---

test("renderToHtml: ssr モードで component を描画する", async () => {
    const options: RenderOptions = {
        mode: "ssr",
        components: {
            Counter: (props, children) => `<my-counter>${children}</my-counter>`,
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
    }
    const result = await renderToHtml(tag("Counter", { count: 5 }, ["click me"]), options)
    assert.equal(result.html, "<my-counter>click me</my-counter>")
    assert.equal(result.hasIslands, false)
})

test("renderToHtml: ssr モードでは island markers を付けない", async () => {
    const options: RenderOptions = {
        mode: "ssr",
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: {} },
        islandComponents: new Set(["Counter"]),
    }
    const result = await renderToHtml(tag("Counter", {}), options)
    assert.notInclude(result.html, "data-ph-island-id")
    assert.equal(result.hasIslands, false)
})

// --- csr モード ---

test("renderToHtml: csr モードで空 shell + props script を出力する", async () => {
    const options: RenderOptions = {
        mode: "csr",
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
    }
    const result = await renderToHtml(tag("Counter", { count: 0 }), options)
    assert.include(result.html, '<Counter data-ph-island-id="ph-1"></Counter>')
    assert.include(result.html, '<script type="application/json" id="ph-props-ph-1">')
    assert.include(result.html, '"count":0')
    assert.equal(result.hasIslands, true)
})

test("renderToHtml: csr モードで islandTagNames を使う", async () => {
    const options: RenderOptions = {
        mode: "csr",
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
        islandTagNames: { Counter: "my-counter" },
    }
    const result = await renderToHtml(tag("Counter", { count: 0 }), options)
    assert.include(result.html, '<my-counter data-ph-island-id="ph-1"></my-counter>')
})

// --- hydration モード ---

test("renderToHtml: hydration モードで全コンポーネントに island markers を付ける", async () => {
    const options: RenderOptions = {
        mode: "hydration",
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
    }
    const result = await renderToHtml(tag("Counter", { count: 0 }), options)
    assert.include(result.html, 'data-ph-island-id="ph-1"')
    assert.include(result.html, "<span>0</span>")
    assert.include(result.html, '<script type="application/json" id="ph-props-ph-1">')
    assert.equal(result.hasIslands, true)
})

// --- island モード ---

test("renderToHtml: island モードで island コンポーネントに markers を付ける", async () => {
    const options: RenderOptions = {
        mode: "island",
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: { count: { type: "number", optional: false } } },
        islandComponents: new Set(["Counter"]),
    }
    const result = await renderToHtml(tag("Counter", { count: 0 }), options)
    assert.include(result.html, 'data-ph-island-id="ph-1"')
    assert.include(result.html, "<span>0</span>")
    assert.equal(result.hasIslands, true)
})

test("renderToHtml: island モードで非 island コンポーネントは markers なし", async () => {
    const options: RenderOptions = {
        mode: "island",
        components: {
            Header: () => "<header>Header</header>",
        },
        propsSchemas: { Header: {} },
        islandComponents: new Set(),
    }
    const result = await renderToHtml(tag("Header", {}), options)
    assert.equal(result.html, "<header>Header</header>")
    assert.notInclude(result.html, "data-ph-island-id")
    assert.equal(result.hasIslands, false)
})

test("renderToHtml: island モードがデフォルト", async () => {
    const options: RenderOptions = {
        components: {
            Counter: () => "<span>0</span>",
        },
        propsSchemas: { Counter: {} },
        islandComponents: new Set(["Counter"]),
    }
    const result = await renderToHtml(tag("Counter", {}), options)
    assert.include(result.html, "data-ph-island-id")
    assert.equal(result.hasIslands, true)
})

// --- filterProps 統合 ---

test("renderToHtml: filterProps でスキーマ外の属性を除外する", async () => {
    let receivedProps: Record<string, unknown> = {}
    const options: RenderOptions = {
        mode: "ssr",
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
        mode: "ssr",
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
