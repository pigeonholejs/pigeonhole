import { test, assert } from "vitest"
import { createDocument, buildBootstrapScript } from "./document"

test("buildBootstrapScript: ブートストラップスクリプトを生成する", () => {
    const result = buildBootstrapScript()
    assert.include(result, '<script type="module">')
    assert.include(result, "lit-element-hydrate-support.js")
    assert.include(result, "restoreIslandProps")
    assert.include(result, "</script>")
})

test("buildBootstrapScript: island modules を含める", () => {
    const result = buildBootstrapScript(["/components/counter.js", "/components/header.js"])
    assert.include(result, 'import "/components/counter.js";')
    assert.include(result, 'import "/components/header.js";')
})

test("buildBootstrapScript: 順序を厳守する", () => {
    const result = buildBootstrapScript(["/components/counter.js"])
    const hydrateSupportIndex = result.indexOf("lit-element-hydrate-support.js")
    const restorePropsIndex = result.indexOf("restoreIslandProps")
    const moduleIndex = result.indexOf("/components/counter.js")

    /**
     * 1. lit-element-hydrate-support.js
     * 2. restoreIslandProps()
     * 3. island modules
     */
    assert.isBelow(hydrateSupportIndex, restorePropsIndex)
    assert.isBelow(restorePropsIndex, moduleIndex)
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
    assert.include(withIslands, '<script type="module">')
    assert.include(withIslands, "restoreIslandProps")

    const withoutIslands = createDocument({ body: "", hasIslands: false })
    assert.notInclude(withoutIslands, '<script type="module">')
})

test("createDocument: hasIslands 未指定の場合は bootstrap script を挿入しない", () => {
    const result = createDocument({ body: "" })
    assert.notInclude(result, '<script type="module">')
})

test("createDocument: islandModules を含める", () => {
    const result = createDocument({
        body: "",
        hasIslands: true,
        islandModules: ["/counter.js"],
    })
    assert.include(result, 'import "/counter.js";')
})
