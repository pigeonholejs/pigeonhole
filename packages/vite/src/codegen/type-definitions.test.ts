import { assert, test } from "vitest"
import { generateTypeDefinitions, generateVirtualModuleTypes } from "./type-definitions"
import type { ComponentInfo } from "../component/types"

// types.d.ts の生成
test("ComponentInfo から types.d.ts の内容を生成する", () => {
    const components: ComponentInfo[] = [
        {
            tagName: "Card",
            customElementTagName: "ph-card",
            moduleSpecifier: "/project/src/components/Card.js",
            hydrateMode: "none",
            propsSchema: {
                title: { type: "string" },
                count: { type: "number" },
            },
        },
    ]

    const result = generateTypeDefinitions(components)
    assert.include(result, "declare namespace Pigeonhole {")
    assert.include(result, "interface CardProps {")
    assert.include(result, "    title: string;")
    assert.include(result, "    count: number;")
})

// ハイフン付きプロパティ名を引用符で囲む
test("ハイフン付きプロパティ名は引用符で囲む", () => {
    const components: ComponentInfo[] = [
        {
            tagName: "PostCard",
            customElementTagName: "sns-post-card",
            moduleSpecifier: "/project/src/components/PostCard.js",
            hydrateMode: "none",
            propsSchema: {
                "post-id": { type: "string" },
                content: { type: "string" },
                "created-at": { type: "string" },
            },
        },
    ]

    const result = generateTypeDefinitions(components)
    assert.include(result, '    "post-id": string;')
    assert.include(result, "    content: string;")
    assert.include(result, '    "created-at": string;')
})

// props がないコンポーネント
test("propsSchema が空のコンポーネントは interface を生成しない", () => {
    const components: ComponentInfo[] = [
        {
            tagName: "Footer",
            customElementTagName: "ph-footer",
            moduleSpecifier: "/project/src/components/Footer.js",
            hydrateMode: "none",
            propsSchema: {},
        },
    ]

    const result = generateTypeDefinitions(components)
    assert.include(result, "declare namespace Pigeonhole {")
    assert.notInclude(result, "FooterProps")
})

// 空のコンポーネントリスト
test("空のコンポーネントリストでも namespace を生成する", () => {
    const result = generateTypeDefinitions([])
    assert.include(result, "declare namespace Pigeonhole {")
    assert.include(result, "}")
})

// virtual-modules.d.ts の生成
test("仮想モジュールの型定義を生成する", () => {
    const result = generateVirtualModuleTypes()
    assert.include(result, 'declare module "virtual:pigeonhole/components"')
    assert.include(result, "export const components:")
    assert.include(result, "export const propsSchemas:")
    assert.include(result, 'import("@pigeonhole/contracts").PropsSchema')
    assert.include(result, 'declare module "virtual:pigeonhole/client"')
    assert.include(result, "export const islands:")
})
