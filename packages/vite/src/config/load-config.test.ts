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

test("config ファイルが存在しない場合はエラーを投げる", async () => {
    const root = createTempDir()
    try {
        try {
            await loadConfig(root)
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "componentRegistries")
        }
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
    mdocDir: "lib/layouts",
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
        assert.equal(config.mdocDir, "lib/layouts")
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
            `export default {
    mdocDir: "content/layouts",
    componentRegistries: [{ kind: "file", path: "custom-elements.json" }]
}
`,
        )

        const config = await loadConfig(root)
        assert.equal(config.mdocDir, "content/layouts")
        assert.deepEqual(config.denyPatterns, [])
        assert.equal(config.strictComplexTypes, false)
        assert.deepEqual(config.componentRegistries, [
            { kind: "file", path: "custom-elements.json" },
        ])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("不正な config はエラーを投げる", async () => {
    const root = createTempDir()
    try {
        writeFileSync(
            join(root, "pigeonhole.config.ts"),
            `export default { componentRegistries: [] }
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
