import { assert, test } from "vitest"
import { generateServerModule } from "./server-module"
import type { ComponentInfo } from "../scanner/types"

// 基本的なサーバーモジュール生成
test("ComponentInfo からサーバー仮想モジュールを生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            isIsland: false,
            customElementTagName: null,
            propsSchema: { title: { type: "string", optional: false } },
        },
        {
            filePath: "/project/src/components/Footer.mdoc.tsx",
            tagName: "Footer",
            isIsland: false,
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    assert.include(result, 'import { Card } from "/project/src/components/Card.mdoc.tsx";')
    assert.include(result, 'import { Footer } from "/project/src/components/Footer.mdoc.tsx";')
    assert.include(result, "export const components = {")
    assert.include(result, "  Card,")
    assert.include(result, "  Footer,")
    assert.include(result, "export const propsSchemas = {")
    assert.include(result, '  Card: {"title":{"type":"string","optional":false}},')
    assert.include(result, "  Footer: {},")
})

// 空のコンポーネントリスト
test("空のコンポーネントリストでは空の components を生成する", () => {
    const result = generateServerModule([])
    assert.include(result, "export const components = {")
    assert.include(result, "};")
})
