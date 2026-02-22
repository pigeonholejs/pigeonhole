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
                tagUsages: {},
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
                tagUsages: {},
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
                tagUsages: {
                    Card: { attributes: ["title", "undeclaredAttr"], hasChildren: false },
                },
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
                tagUsages: { Card: { attributes: ["class"], hasChildren: false } },
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
                tagUsages: { Card: { attributes: ["title", "count"], hasChildren: false } },
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
test("未登録の PascalCase タグはエラーを投げる", () => {
    const root = createTempDir()
    try {
        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagUsages: { UnknownTag: { attributes: ["someAttr"], hasChildren: false } },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, new Map(), [])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, 'tag "UnknownTag"')
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("組み込み if タグは未登録でも許可される", () => {
    const root = createTempDir()
    try {
        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(root, "src/pages/index.mdoc"),
                imports: [],
                inputs: [],
                tagUsages: { if: { attributes: [], hasChildren: true } },
            },
        ]

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
                tagUsages: {},
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
                tagUsages: {},
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
                tagUsages: { Profile: { attributes: ["count"], hasChildren: false } },
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
                tagUsages: { Card: { attributes: ["meta"], hasChildren: false } },
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

test("mdoc import は PascalCase ファイル名を要求する", () => {
    const root = createTempDir()
    try {
        const layoutsDir = join(root, "src/layouts")
        mkdirSync(layoutsDir, { recursive: true })
        writeFileSync(join(layoutsDir, "timeline-layout.mdoc"), "{% Children /%}\n")

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(layoutsDir, "Page.mdoc"),
                imports: [{ path: "src/layouts/timeline-layout.mdoc" }],
                inputs: [],
                tagUsages: {},
            },
            {
                filePath: join(layoutsDir, "timeline-layout.mdoc"),
                imports: [],
                inputs: [],
                tagUsages: { Children: { attributes: [], hasChildren: false } },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, new Map(), [])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "PascalCase file name")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("mdoc import の入力属性は child input で検証される", () => {
    const root = createTempDir()
    try {
        const layoutsDir = join(root, "src/layouts")
        mkdirSync(layoutsDir, { recursive: true })
        writeFileSync(join(layoutsDir, "TimelineLayout.mdoc"), "{% Children /%}\n")

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(layoutsDir, "Page.mdoc"),
                imports: [{ path: "src/layouts/TimelineLayout.mdoc" }],
                inputs: [],
                tagUsages: {
                    TimelineLayout: { attributes: ["unknown"], hasChildren: true },
                },
            },
            {
                filePath: join(layoutsDir, "TimelineLayout.mdoc"),
                imports: [],
                inputs: [{ variableName: "title" }],
                tagUsages: { Children: { attributes: [], hasChildren: false } },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, new Map(), [])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, 'undeclared attribute "unknown"')
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("children 付きで mdoc タグを使う場合は child 側に Children が必要", () => {
    const root = createTempDir()
    try {
        const layoutsDir = join(root, "src/layouts")
        mkdirSync(layoutsDir, { recursive: true })
        writeFileSync(join(layoutsDir, "TimelineLayout.mdoc"), "no slot\n")

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(layoutsDir, "Page.mdoc"),
                imports: [{ path: "src/layouts/TimelineLayout.mdoc" }],
                inputs: [],
                tagUsages: { TimelineLayout: { attributes: [], hasChildren: true } },
            },
            {
                filePath: join(layoutsDir, "TimelineLayout.mdoc"),
                imports: [],
                inputs: [],
                tagUsages: {},
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, new Map(), [])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, 'does not include "{% Children /%}"')
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("mdoc import の循環参照はエラー", () => {
    const root = createTempDir()
    try {
        const layoutsDir = join(root, "src/layouts")
        mkdirSync(layoutsDir, { recursive: true })
        writeFileSync(join(layoutsDir, "A.mdoc"), "{% B /%}\n")
        writeFileSync(join(layoutsDir, "B.mdoc"), "{% A /%}\n")

        const mdocFiles: MdocFileInfo[] = [
            {
                filePath: join(layoutsDir, "A.mdoc"),
                imports: [{ path: "src/layouts/B.mdoc" }],
                inputs: [],
                tagUsages: { B: { attributes: [], hasChildren: false } },
            },
            {
                filePath: join(layoutsDir, "B.mdoc"),
                imports: [{ path: "src/layouts/A.mdoc" }],
                inputs: [],
                tagUsages: { A: { attributes: [], hasChildren: false } },
            },
        ]

        try {
            validateMdocFiles(mdocFiles, root, new Map(), [])
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "circular mdoc import")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
