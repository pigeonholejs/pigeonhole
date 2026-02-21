import { describe, test, assert } from "vitest"
import { renderMdoc } from "./render-mdoc"

describe("renderMdoc", () => {
    test("プレーンテキストを HTML にレンダリングする", async () => {
        const result = await renderMdoc("# Hello\n\nWorld", {})
        assert.include(result.html, "<h1>")
        assert.include(result.html, "Hello")
        assert.include(result.html, "<p>")
        assert.include(result.html, "World")
        assert.equal(result.hasIslands, false)
    })

    test("変数をテンプレートに展開する", async () => {
        const result = await renderMdoc("Hello {% $name %}", { name: "Alice" })
        assert.include(result.html, "Alice")
    })

    test("コンポーネントを SSR で描画する", async () => {
        const source = '{% Callout type="info" %}content{% /Callout %}'
        const result = await renderMdoc(
            source,
            {},
            {
                components: {
                    Callout: (props, children: string) =>
                        // oxlint-disable-next-line typescript/restrict-template-expressions
                        `<div class="callout-${props.type}">${children}</div>`,
                },
                propsSchemas: {
                    Callout: {
                        type: { type: "string", optional: false },
                        children: { type: "string", optional: true },
                    },
                },
            },
        )
        assert.include(result.html, '<div class="callout-info">')
        assert.include(result.html, "content")
        assert.equal(result.hasIslands, false)
    })

    test("number 型の属性が正しく渡される", async () => {
        const source = "{% Counter count=5 %}content{% /Counter %}"
        const result = await renderMdoc(
            source,
            {},
            {
                components: {
                    Counter: (props, children) =>
                        `<div data-count="${props.count}">${children}</div>`,
                },
                propsSchemas: {
                    Counter: {
                        count: { type: "number", optional: false },
                        children: { type: "string", optional: true },
                    },
                },
            },
        )
        assert.include(result.html, 'data-count="5"')
        assert.include(result.html, "content")
    })

    test("オプションなしでもデフォルトで動作する", async () => {
        const result = await renderMdoc("plain text", {})
        assert.include(result.html, "plain text")
        assert.equal(result.hasIslands, false)
    })

    test("denyPatterns で指定した属性がコンポーネントに渡らない", async () => {
        const source = '{% Callout class="foo" id="bar" type="info" %}content{% /Callout %}'
        const result = await renderMdoc(
            source,
            {},
            {
                components: {
                    Callout: (props, children) => {
                        const keys = Object.keys(props).sort().join(",")
                        return `<div data-props="${keys}">${children}</div>`
                    },
                },
                propsSchemas: {
                    Callout: {
                        type: { type: "string", optional: false },
                        children: { type: "string", optional: true },
                    },
                },
                denyPatterns: ["class", "id"],
            },
        )
        assert.include(result.html, 'data-props="children,type"')
        assert.notInclude(result.html, "foo")
        assert.notInclude(result.html, "bar")
    })

    test("hydrateComponents に含まれるコンポーネントがあれば hasIslands が true になる", async () => {
        const source = '{% Callout type="info" %}content{% /Callout %}'
        const result = await renderMdoc(
            source,
            {},
            {
                components: {
                    Callout: (props, children) => `<div class="callout">${children}</div>`,
                },
                propsSchemas: {
                    Callout: {
                        type: { type: "string", optional: false },
                        children: { type: "string", optional: true },
                    },
                },
                hydrateComponents: new Map([["Callout", "eager"]]),
            },
        )
        assert.include(result.html, "callout")
        assert.equal(result.hasIslands, true)
    })
})
