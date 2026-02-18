import { assert, test } from "vitest"
import { generateTypeDefinitions, generateVirtualModuleTypes } from "./type-definitions"
import type { ComponentInfo } from "../scanner/types"

// types.d.ts の生成
test("ComponentInfo から types.d.ts の内容を生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            hydrateMode: "none",
            customElementTagName: null,
            propsSchema: {
                title: { type: "string", optional: false },
                count: { type: "number", optional: true },
            },
        },
    ]

    const result = generateTypeDefinitions(components)
    assert.include(result, "declare namespace Pigeonhole {")
    assert.include(result, "interface CardProps {")
    assert.include(result, "    title: string;")
    assert.include(result, "    count?: number;")
})

// props がないコンポーネント
test("propsSchema が空のコンポーネントは interface を生成しない", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Footer.mdoc.tsx",
            tagName: "Footer",
            hydrateMode: "none",
            customElementTagName: null,
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
    assert.include(result, 'declare module "virtual:pigeonhole/client"')
    assert.include(result, "export const islands:")
})
