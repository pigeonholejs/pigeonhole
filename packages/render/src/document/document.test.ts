import { test, assert } from "vitest"
import { createDocument, buildBootstrapScript } from "./document"

test("buildBootstrapScript: 外部スクリプト参照を生成する", () => {
    const result = buildBootstrapScript()
    assert.include(result, '<script type="module"')
    assert.include(result, 'src="/.pigeonhole/client-entry.js"')
    assert.include(result, "</script>")
})

test("buildBootstrapScript: インラインスクリプトを含まない", () => {
    const result = buildBootstrapScript()
    assert.notInclude(result, "import ")
    assert.notInclude(result, "restoreIslandProps")
})

test("createDocument: 基本的なドキュメントを生成する", () => {
    const result = createDocument({ body: "<p>hello</p>" })
    assert.include(result, "<!doctype html>")
    assert.include(result, '<html lang="en">')
    assert.include(result, '<meta charset="utf-8">')
    assert.include(result, "<p>hello</p>")
    assert.include(result, "</html>")
})

test("createDocument: lang パラメータでカスタム言語を設定する", () => {
    const result = createDocument({ body: "", lang: "ja" })
    assert.include(result, '<html lang="ja">')
})

test("createDocument: title を含める", () => {
    const result = createDocument({ body: "", title: "My Page" })
    assert.include(result, "<title>My Page</title>")
})

test("createDocument: head を含める", () => {
    const result = createDocument({
        body: "",
        head: '<link rel="stylesheet" href="style.css">',
    })
    assert.include(result, '<link rel="stylesheet" href="style.css">')
})

test("createDocument: hasIslands が true の場合のみ bootstrap script を挿入する", () => {
    const withIslands = createDocument({ body: "", hasIslands: true })
    assert.include(withIslands, '<script type="module"')
    assert.include(withIslands, "client-entry.js")

    const withoutIslands = createDocument({ body: "", hasIslands: false })
    assert.notInclude(withoutIslands, '<script type="module"')
})

test("createDocument: hasIslands 未指定の場合は bootstrap script を挿入しない", () => {
    const result = createDocument({ body: "" })
    assert.notInclude(result, '<script type="module"')
})
