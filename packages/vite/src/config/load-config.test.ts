import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { assert, test } from "vitest"
import { loadConfig } from "./load-config"

function createTempDir(): string {
    const dir = join(
        tmpdir(),
        `pigeonhole-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    mkdirSync(dir, { recursive: true })
    return dir
}

test("config ファイルが存在しない場合はデフォルト値を返す", async () => {
    const root = createTempDir()
    try {
        const config = await loadConfig(root)
        assert.equal(config.componentsDir, "src/components")
        assert.equal(config.pagesDir, "src/pages")
        assert.deepEqual(config.denyPatterns, [])
        assert.equal(config.strictComplexTypes, false)
        assert.deepEqual(config.componentRegistries, [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("config ファイルからユーザー設定を読み込む", async () => {
    const root = createTempDir()
    try {
        writeFileSync(
            join(root, "pigeonhole.config.ts"),
            `export default {
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
}
`,
        )

        const config = await loadConfig(root)
        assert.equal(config.componentsDir, "lib/components")
        assert.equal(config.pagesDir, "lib/pages")
        assert.deepEqual(config.denyPatterns, ["class", "style"])
        assert.equal(config.strictComplexTypes, true)
        assert.deepEqual(config.componentRegistries, [
            {
                kind: "package",
                packageName: "@acme/ui",
                cemPath: "dist/custom-elements.json",
            },
        ])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("部分的な config でもデフォルト値が補完される", async () => {
    const root = createTempDir()
    try {
        writeFileSync(
            join(root, "pigeonhole.config.ts"),
            `export default { pagesDir: "content/pages" }
`,
        )

        const config = await loadConfig(root)
        assert.equal(config.componentsDir, "src/components")
        assert.equal(config.pagesDir, "content/pages")
        assert.deepEqual(config.denyPatterns, [])
        assert.equal(config.strictComplexTypes, false)
        assert.deepEqual(config.componentRegistries, [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("不正な config はエラーを投げる", async () => {
    const root = createTempDir()
    try {
        writeFileSync(
            join(root, "pigeonhole.config.ts"),
            `export default { componentsDir: 123 }
`,
        )

        try {
            await loadConfig(root)
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "invalid pigeonhole config")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
