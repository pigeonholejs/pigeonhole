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

// Lit コンポーネント（customElementTagName あり）のブリッジ生成
test("Lit コンポーネントを createLitBridge でラップする", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Counter.mdoc.tsx",
            tagName: "Counter",
            isIsland: true,
            customElementTagName: "ph-counter",
            propsSchema: { count: { type: "number", optional: false } },
        },
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            isIsland: false,
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    // Lit ブリッジ import が含まれる
    assert.include(result, 'import { createLitBridge } from "@pigeonhole/render/lit";')
    // Lit コンポーネントはクラスインポート + ブリッジラップ
    assert.include(result, 'import { Counter as _CounterClass } from "/project/src/components/Counter.mdoc.tsx";')
    assert.include(result, 'const Counter = createLitBridge(_CounterClass, "ph-counter");')
    // 関数コンポーネントは既存通り
    assert.include(result, 'import { Card } from "/project/src/components/Card.mdoc.tsx";')
    // components map に両方含まれる
    assert.include(result, "  Counter,")
    assert.include(result, "  Card,")
})

// Lit コンポーネントがない場合は createLitBridge をインポートしない
test("Lit コンポーネントがない場合はブリッジをインポートしない", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            isIsland: false,
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    assert.notInclude(result, "createLitBridge")
})

// 空のコンポーネントリスト
test("空のコンポーネントリストでは空の components を生成する", () => {
    const result = generateServerModule([])
    assert.include(result, "export const components = {")
    assert.include(result, "};")
})
