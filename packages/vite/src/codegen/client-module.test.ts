import { assert, test } from "vitest"
import { generateClientModule } from "./client-module"
import type { ComponentInfo } from "../scanner/types"

// 基本的なクライアントモジュール生成
test("island コンポーネントからクライアント仮想モジュールを生成する", () => {
    const islands: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Counter.mdoc.tsx",
            tagName: "Counter",
            isIsland: true,
            customElementTagName: "ph-counter",
            propsSchema: { count: "number" },
        },
    ]

    const result = generateClientModule(islands)

    // ブート順
    // 1. @lit-labs/ssr-client/lit-element-hydrate-support.js
    // 2. restoreIslandProps()
    // 3. アイランドモジュール eager import
    const lines = result.split("\n")
    const hydrateIndex = lines.findIndex((l) =>
        l.includes("@lit-labs/ssr-client/lit-element-hydrate-support.js"),
    )
    const restoreIndex = lines.findIndex((l) => l.includes("restoreIslandProps"))
    const importIndex = lines.findIndex((l) => l.includes("Counter.mdoc.tsx"))

    assert.isAbove(hydrateIndex, -1)
    assert.isAbove(restoreIndex, hydrateIndex)
    assert.isAbove(importIndex, restoreIndex)
})

// island マップの生成
test("island マップに tagName と customElementTagName のマッピングを含む", () => {
    const islands: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Counter.mdoc.tsx",
            tagName: "Counter",
            isIsland: true,
            customElementTagName: "ph-counter",
            propsSchema: {},
        },
    ]

    const result = generateClientModule(islands)
    assert.include(result, '"Counter": "ph-counter"')
})

// customElementTagName が null の island
test("customElementTagName が null の island は islands マップに含めない", () => {
    const islands: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Widget.mdoc.tsx",
            tagName: "Widget",
            isIsland: true,
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateClientModule(islands)
    assert.include(result, 'import "/project/src/components/Widget.mdoc.tsx";')
    assert.notInclude(result, '"Widget"')
})

// 空の island リスト
test("空の island リストでも基本構造を生成する", () => {
    const result = generateClientModule([])
    assert.include(result, "@lit-labs/ssr-client/lit-element-hydrate-support.js")
    assert.include(result, "restoreIslandProps")
    assert.include(result, "export const islands = {")
})
