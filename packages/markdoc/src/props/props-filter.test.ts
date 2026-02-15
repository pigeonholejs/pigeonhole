import { assert, test } from "vitest"
import { filterProps } from "./props-filter"

// 基本的なフィルタリング
test("schema に宣言されたキーのみ通す", () => {
    const result = filterProps({
        attrs: { title: "hello", count: 42, undeclared: "bad" },
        schema: { title: "string", count: "number" },
        authorAttrs: new Set(["title", "count"]),
        denyPatterns: [],
    })

    assert.deepStrictEqual(result, { title: "hello", count: 42 })
})

test("schema に存在しない attrs のキーは破棄される", () => {
    const result = filterProps({
        attrs: { title: "hello", evil: "script", hack: "xss" },
        schema: { title: "string" },
        authorAttrs: new Set(["title"]),
        denyPatterns: [],
    })

    assert.deepStrictEqual(result, { title: "hello" })
})

// authorAttrs の schema 未宣言キー検出
test("authorAttrs に schema 未宣言キーがある場合 build error", () => {
    assert.throws(
        () =>
            filterProps({
                attrs: { title: "hello", evil: "script" },
                schema: { title: "string" },
                authorAttrs: new Set(["title", "evil"]),
                denyPatterns: [],
            }),
        /undeclared attribute "evil"/,
    )
})

// deny パターン一致検出
test("authorAttrs に deny パターン一致キーがある場合 build error", () => {
    assert.throws(
        () =>
            filterProps({
                attrs: { title: "hello", class: "foo" },
                schema: { title: "string", class: "string" },
                authorAttrs: new Set(["title", "class"]),
                denyPatterns: ["class", "style", "id"],
            }),
        /denied attribute "class"/,
    )
})

test("ワイルドカード deny パターンに一致する場合 build error", () => {
    assert.throws(
        () =>
            filterProps({
                attrs: { title: "hello", "on-click": "alert(1)" },
                schema: { title: "string", "on-click": "string" },
                authorAttrs: new Set(["title", "on-click"]),
                denyPatterns: ["on-*"],
            }),
        /denied attribute "on-click"/,
    )
})

// children の処理
test("schema に children がある場合のみ children を通す", () => {
    const result = filterProps({
        attrs: { title: "hello" },
        schema: { title: "string", children: "string" },
        authorAttrs: new Set(["title"]),
        denyPatterns: [],
        renderedChildren: "<p>child</p>",
    })

    assert.deepStrictEqual(result, {
        title: "hello",
        children: "<p>child</p>",
    })
})

test("schema に children がない場合は children を除外する", () => {
    const result = filterProps({
        attrs: { title: "hello" },
        schema: { title: "string" },
        authorAttrs: new Set(["title"]),
        denyPatterns: [],
        renderedChildren: "<p>child</p>",
    })

    assert.deepStrictEqual(result, { title: "hello" })
})

// 自動生成属性の扱い
test("自動生成属性は build error にならないが schema にない場合は破棄される", () => {
    const result = filterProps({
        attrs: { title: "hello", id: "auto-generated-id" },
        schema: { title: "string" },
        authorAttrs: new Set(["title"]),
        denyPatterns: ["id"],
    })

    assert.deepStrictEqual(result, { title: "hello" })
})

test("自動生成属性が schema に宣言されている場合は通す", () => {
    const result = filterProps({
        attrs: { title: "hello", id: "heading-1" },
        schema: { title: "string", id: "string" },
        authorAttrs: new Set(["title"]),
        denyPatterns: [],
    })

    assert.deepStrictEqual(result, { title: "hello", id: "heading-1" })
})

// ...attrs 暗黙フォワードの禁止
test("attrs に大量のキーがあっても schema に宣言されたキーのみ通す", () => {
    const attrs: Record<string, unknown> = {}
    for (let i = 0; i < 100; i++) {
        attrs[`attr${String(i)}`] = `value${String(i)}`
    }
    attrs.title = "allowed"

    const result = filterProps({
        attrs,
        schema: { title: "string" },
        authorAttrs: new Set(["title"]),
        denyPatterns: [],
    })

    assert.deepStrictEqual(result, { title: "allowed" })
})

// 空の schema
test("空の schema では全ての attrs が破棄される", () => {
    const result = filterProps({
        attrs: { title: "hello", count: 42 },
        schema: {},
        authorAttrs: new Set<string>(),
        denyPatterns: [],
    })

    assert.deepStrictEqual(result, {})
})
