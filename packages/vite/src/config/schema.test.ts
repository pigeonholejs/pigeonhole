import { assert, test } from "vitest"
import { configSchema, defineConfig } from "./schema"

test("デフォルト値が適用される", () => {
    const result = configSchema.parse({})
    assert.equal(result.componentsDir, "src/components")
    assert.equal(result.pagesDir, "src/pages")
    assert.deepEqual(result.denyPatterns, [])
    assert.equal(result.strictComplexTypes, false)
    assert.deepEqual(result.componentRegistries, [])
})

test("ユーザー指定値が優先される", () => {
    const result = configSchema.parse({
        componentsDir: "lib/components",
        pagesDir: "lib/pages",
        denyPatterns: ["class", "style"],
        strictComplexTypes: true,
        componentRegistries: [
            {
                kind: "package",
                packageName: "@acme/ui",
                cemPath: "dist/custom-elements.json",
            },
        ],
    })
    assert.equal(result.componentsDir, "lib/components")
    assert.equal(result.pagesDir, "lib/pages")
    assert.deepEqual(result.denyPatterns, ["class", "style"])
    assert.equal(result.strictComplexTypes, true)
    assert.deepEqual(result.componentRegistries, [
        {
            kind: "package",
            packageName: "@acme/ui",
            cemPath: "dist/custom-elements.json",
        },
    ])
})

test("部分的な指定でも残りはデフォルトが適用される", () => {
    const result = configSchema.parse({ pagesDir: "content/pages" })
    assert.equal(result.componentsDir, "src/components")
    assert.equal(result.pagesDir, "content/pages")
    assert.deepEqual(result.denyPatterns, [])
    assert.equal(result.strictComplexTypes, false)
    assert.deepEqual(result.componentRegistries, [])
})

test("不正な型はエラーになる", () => {
    const result = configSchema.safeParse({ componentsDir: 123 })
    assert.isFalse(result.success)
})

test("defineConfig は入力をそのまま返す", () => {
    const input = { componentsDir: "custom/components" }
    const output = defineConfig(input)
    assert.deepEqual(output, input)
})

test("componentRegistries の file 設定を受け付ける", () => {
    const result = configSchema.parse({
        componentRegistries: [{ kind: "file", path: ".pigeonhole/custom-elements.json" }],
    })
    assert.deepEqual(result.componentRegistries, [
        { kind: "file", path: ".pigeonhole/custom-elements.json" },
    ])
})
