import { test, assert } from "vitest"
import { serializeAttributes } from "./serialize-attributes"

test("serializeAttributes: 空オブジェクトは空文字を返す", () => {
    assert.equal(serializeAttributes({}), "")
})

test("serializeAttributes: null をスキップする", () => {
    assert.equal(serializeAttributes({ a: null }), "")
})

test("serializeAttributes: undefined をスキップする", () => {
    assert.equal(serializeAttributes({ a: undefined }), "")
})

test("serializeAttributes: false をスキップする", () => {
    assert.equal(serializeAttributes({ a: false }), "")
})

test("serializeAttributes: true は属性名のみ出力する", () => {
    assert.equal(serializeAttributes({ disabled: true }), " disabled")
})

test("serializeAttributes: 文字列をエスケープして出力する", () => {
    assert.equal(serializeAttributes({ class: "foo" }), ' class="foo"')
})

test("serializeAttributes: 数値を文字列化して出力する", () => {
    assert.equal(serializeAttributes({ width: 100 }), ' width="100"')
})

test("serializeAttributes: 文字列の特殊文字をエスケープする", () => {
    assert.equal(serializeAttributes({ title: 'a"b' }), ' title="a&quot;b"')
})

test("serializeAttributes: 複数属性をスペース区切りで出力する", () => {
    assert.equal(serializeAttributes({ id: "x", class: "y" }), ' id="x" class="y"')
})

test("serializeAttributes: オブジェクト型はスキップする", () => {
    assert.equal(serializeAttributes({ data: { key: "value" } }), "")
})

test("serializeAttributes: 混在する型を正しく処理する", () => {
    const result = serializeAttributes({
        id: "test",
        hidden: true,
        disabled: false,
        width: 50,
        extra: null,
    })
    assert.equal(result, ' id="test" hidden width="50"')
})
