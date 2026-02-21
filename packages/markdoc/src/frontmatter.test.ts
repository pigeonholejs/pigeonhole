import { test, assert } from "vitest"
import { parse } from "markdecl"
import { filterFrontmatter } from "./frontmatter"

test("frontmatterがない場合は空のfrontmatterを返す", () => {
    const ast = parse("# Hello World")
    const frontmatter = filterFrontmatter(ast)
    assert.deepEqual(frontmatter, {})
})

test("importを抽出できる", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
    - "./components/shared/TextForm.mdoc.tsx"
---
# Hello`
    const ast = parse(source)
    const frontmatter = filterFrontmatter(ast)
    assert.deepEqual(frontmatter.imports, [
        { path: "./components/shared/Button.mdoc" },
        { path: "./components/shared/TextForm.mdoc.tsx" },
    ])
})

test("inputを抽出できる", () => {
    const source = `---
- input:
    - user
    - posts
    - year
---
# Hello`
    const ast = parse(source)
    const frontmatter = filterFrontmatter(ast)
    assert.deepEqual(frontmatter.inputs, [
        { variableName: "user" },
        { variableName: "posts" },
        { variableName: "year" },
    ])
})

test("importとinputの両方を抽出できる", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
- input:
    - user
---
# Hello`
    const ast = parse(source)
    const frontmatter = filterFrontmatter(ast)
    assert.deepEqual(frontmatter.imports, [{ path: "./components/shared/Button.mdoc" }])
    assert.deepEqual(frontmatter.inputs, [{ variableName: "user" }])
})

test("allowListでimportのみ許可するとinputは無視される", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
- input:
    - user
---
# Hello`
    const ast = parse(source)
    const frontmatter = filterFrontmatter(ast, ["import"])
    assert.deepEqual(frontmatter.imports, [{ path: "./components/shared/Button.mdoc" }])
    assert.isUndefined(frontmatter.inputs)
})

test("allowListでinputのみ許可するとimportは無視される", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
- input:
    - user
---
# Hello`
    const ast = parse(source)
    const frontmatter = filterFrontmatter(ast, ["input"])
    assert.isUndefined(frontmatter.imports)
    assert.deepEqual(frontmatter.inputs, [{ variableName: "user" }])
})

test("allowListが空配列の場合はすべてのfrontmatterが無視される", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
- input:
    - user
---
# Hello`
    const ast = parse(source)
    const frontmatter = filterFrontmatter(ast, [])
    assert.isUndefined(frontmatter.imports)
    assert.isUndefined(frontmatter.inputs)
})
