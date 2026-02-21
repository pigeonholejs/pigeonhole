import { test, assert } from "vitest"
import { escapeHtml, escapeAttribute } from "./escape"

test("escapeHtml: & をエスケープする", () => {
    assert.equal(escapeHtml("a&b"), "a&amp;b")
})

test("escapeHtml: < をエスケープする", () => {
    assert.equal(escapeHtml("a<b"), "a&lt;b")
})

test("escapeHtml: > をエスケープする", () => {
    assert.equal(escapeHtml("a>b"), "a&gt;b")
})

test("escapeHtml: 複数の特殊文字をエスケープする", () => {
    assert.equal(
        escapeHtml("<script>alert('&')</script>"),
        "&lt;script&gt;alert('&amp;')&lt;/script&gt;",
    )
})

test("escapeHtml: 特殊文字がない場合はそのまま返す", () => {
    assert.equal(escapeHtml("hello world"), "hello world")
})

test('escapeAttribute: " をエスケープする', () => {
    assert.equal(escapeAttribute('a"b'), "a&quot;b")
})

test('escapeAttribute: &, <, >, " を全てエスケープする', () => {
    assert.equal(escapeAttribute('&<>"'), "&amp;&lt;&gt;&quot;")
})

test("escapeAttribute: 特殊文字がない場合はそのまま返す", () => {
    assert.equal(escapeAttribute("hello"), "hello")
})
