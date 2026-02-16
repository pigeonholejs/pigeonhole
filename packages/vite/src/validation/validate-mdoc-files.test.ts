import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { assert, test } from "vitest"
import { validateMdocFiles } from "./validate-mdoc-files"
import type { MdocFileInfo } from "../scanner/types"
import type { PropsSchema } from "@pigeonhole/render"

/**
 * テスト用の一時ディレクトリを作成する
 */
function createTempDir(): string {
    const dir = join(
        tmpdir(),
        `pigeonhole-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    mkdirSync(dir, { recursive: true })
    return dir
}

// import パスの解決可能性
test("存在する import パスは検証を通過する", () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })
        writeFileSync(join(componentsDir, "Card.mdoc.tsx"), "")

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [{ path: "components/Card.mdoc.tsx" }],
                inputs: [],
                tagAttributes: {},
            },
        ]

        /**
         * エラーが投げられないことを確認する
         */
        validateMdocFiles(mdocFiles, root, new Map(), [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("存在しない import パスはエラーを投げる", () => {
    const root = createTempDir()
    try {
        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [{ path: "components/Missing.mdoc.tsx" }],
                inputs: [],
                tagAttributes: {},
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, new Map(), [])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "does not resolve to an existing file")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// 未宣言属性の検出
test("スキーマに宣言されていない属性はエラーを投げる", () => {
    const root = createTempDir()
    try {
        const schema: PropsSchema = { title: "string" }
        const componentSchemaMap = new Map<string, PropsSchema>()
        componentSchemaMap.set("Card", schema)

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagAttributes: { Card: ["title", "undeclaredAttr"] },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, componentSchemaMap, [])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, 'undeclared attribute "undeclaredAttr"')
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// deny パターン照合
test("deny パターンに一致する属性はエラーを投げる", () => {
    const root = createTempDir()
    try {
        const schema: PropsSchema = { class: "string" }
        const componentSchemaMap = new Map<string, PropsSchema>()
        componentSchemaMap.set("Card", schema)

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagAttributes: { Card: ["class"] },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, componentSchemaMap, ["class", "style", "id"])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "denied attribute")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// 正常な属性使用
test("スキーマに宣言されている属性は検証を通過する", () => {
    const root = createTempDir()
    try {
        const schema: PropsSchema = { title: "string", "count?": "number" }
        const componentSchemaMap = new Map<string, PropsSchema>()
        componentSchemaMap.set("Card", schema)

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagAttributes: { Card: ["title", "count"] },
            },
        ]

        /**
         * エラーが投げられないことを確認する
         */
        validateMdocFiles(mdocFiles, root, componentSchemaMap, [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// スキーマが存在しないタグ
test("スキーマが存在しないタグの属性は検証をスキップする", () => {
    const root = createTempDir()
    try {
        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagAttributes: { UnknownTag: ["someAttr"] },
            },
        ]

        /**
         * スキーマが存在しないタグは検証をスキップする
         */
        validateMdocFiles(mdocFiles, root, new Map(), [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
