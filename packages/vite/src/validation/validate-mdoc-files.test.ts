import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { assert, test } from "vitest"
import { validateMdocFiles } from "./validate-mdoc-files"
import type { MdocFileInfo } from "../mdoc/types"
import type { PropsSchema } from "@pigeonhole/contracts"
import type { ComponentContract } from "../registry/types"

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
        writeFileSync(join(componentsDir, "Card.tsx"), "")

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [{ path: "src/components/Card.tsx" }],
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
                imports: [{ path: "src/components/Missing.tsx" }],
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
        const schema: PropsSchema = { title: { type: "string" } }
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
        const schema: PropsSchema = { class: { type: "string" } }
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
        const schema: PropsSchema = {
            title: { type: "string" },
            count: { type: "number" },
        }
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

test("knownPackageImports に含まれる bare import は許可される", () => {
    const root = createTempDir()
    try {
        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [{ path: "@acme/ui" }],
                inputs: [],
                tagAttributes: {},
            },
        ]

        validateMdocFiles(mdocFiles, root, new Map(), [], {
            knownPackageImports: new Set(["@acme/ui"]),
        })
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("unknown bare import はエラーを投げる", () => {
    const root = createTempDir()
    try {
        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [{ path: "@acme/missing" }],
                inputs: [],
                tagAttributes: {},
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, new Map(), [], {
                knownPackageImports: new Set(["@acme/ui"]),
            })
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "bare specifier")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("required 属性が欠落している場合はエラーを投げる", () => {
    const root = createTempDir()
    try {
        const componentSchemaMap = new Map<string, PropsSchema>()
        componentSchemaMap.set("Profile", {
            user: { type: "string" },
            count: { type: "number" },
        })

        const profileContract: ComponentContract = {
            componentName: "Profile",
            customElementTagName: "ph-profile",
            moduleSpecifier: "@acme/ui/profile.js",
            hydrateMode: "none",
            source: "custom-elements.json",
            attributes: {
                user: {
                    name: "user",
                    required: true,
                    type: { kind: "primitive", primitive: "string", rawText: "string" },
                },
                count: {
                    name: "count",
                    required: false,
                    type: { kind: "primitive", primitive: "number", rawText: "number" },
                },
            },
        }

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagAttributes: { Profile: ["count"] },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, componentSchemaMap, [], {
                componentContracts: new Map([["Profile", profileContract]]),
            })
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, 'required attribute "user"')
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("strictComplexTypes で complex/reference/unknown を拒否する", () => {
    const root = createTempDir()
    try {
        const componentSchemaMap = new Map<string, PropsSchema>()
        componentSchemaMap.set("Card", {
            meta: { type: "unknown" },
        })

        const cardContract: ComponentContract = {
            componentName: "Card",
            customElementTagName: "ph-card",
            moduleSpecifier: "@acme/ui/card.js",
            hydrateMode: "none",
            source: "custom-elements.json",
            attributes: {
                meta: {
                    name: "meta",
                    required: false,
                    type: { kind: "complex", rawText: "Record<string, unknown>", references: [] },
                },
            },
        }

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagAttributes: { Card: ["meta"] },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, componentSchemaMap, [], {
                componentContracts: new Map([["Card", cardContract]]),
                strictComplexTypes: true,
            })
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "strictComplexTypes")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
