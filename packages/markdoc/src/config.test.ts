import { test, assert } from "vitest"
import { parse } from "strictmdoc"
import { buildConfig } from "./config"

test("frontmatterがない場合は空のvariablesを返す", () => {
    const ast = parse("# Hello World")
    const config = buildConfig(ast)
    assert.deepEqual(config, { variables: {} })
})

test("importsがvariablesに含まれる", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
    - "./components/shared/TextForm.tsx"
---
# Hello`
    const ast = parse(source)
    const config = buildConfig(ast)
    assert.deepEqual(config.variables, {
        imports: [
            { path: "./components/shared/Button.mdoc" },
            { path: "./components/shared/TextForm.tsx" },
        ],
    })
})

test("inputsがvariablesに含まれる", () => {
    const source = `---
- input:
    - user
    - posts
---
# Hello`
    const ast = parse(source)
    const config = buildConfig(ast)
    assert.deepEqual(config.variables, {
        inputs: [{ variableName: "user" }, { variableName: "posts" }],
    })
})

test("importsとinputsの両方がvariablesに含まれる", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
- input:
    - user
---
# Hello`
    const ast = parse(source)
    const config = buildConfig(ast)
    assert.deepEqual(config.variables, {
        imports: [{ path: "./components/shared/Button.mdoc" }],
        inputs: [{ variableName: "user" }],
    })
})

test("allowedFrontmatterを渡すとfrontmatterがフィルタされる", () => {
    const source = `---
- import:
    - "./components/shared/Button.mdoc"
- input:
    - user
---
# Hello`
    const ast = parse(source)
    const config = buildConfig(ast, ["input"])
    assert.deepEqual(config.variables, {
        inputs: [{ variableName: "user" }],
    })
})
