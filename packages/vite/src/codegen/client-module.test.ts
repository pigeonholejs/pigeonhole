import { assert, test } from "vitest"
import { generateClientModule } from "./client-module"
import type { ComponentInfo } from "../component/types"

test("island コンポーネントからクライアント仮想モジュールを生成する", () => {
    const islands: ComponentInfo[] = [
        {
            tagName: "Counter",
            customElementTagName: "ph-counter",
            moduleSpecifier: "/project/src/components/Counter.js",
            hydrateMode: "eager",
            propsSchema: { count: { type: "number" } },
        },
    ]

    const result = generateClientModule(islands)
    const lines = result.split("\n")
    const hydrateIndex = lines.findIndex((line) =>
        line.includes("@lit-labs/ssr-client/lit-element-hydrate-support.js"),
    )
    const restoreIndex = lines.findIndex((line) => line.includes("restoreIslandProps"))
    const importIndex = lines.findIndex((line) => line.includes('import "/project/src/components/Counter.js"'))

    assert.isAbove(hydrateIndex, -1)
    assert.isAbove(restoreIndex, hydrateIndex)
    assert.isAbove(importIndex, restoreIndex)
    assert.include(result, '"Counter": "ph-counter"')
})

test("lazy island は observeLazyIslands + dynamic import で生成される", () => {
    const islands: ComponentInfo[] = [
        {
            tagName: "Slider",
            customElementTagName: "ph-slider",
            moduleSpecifier: "/project/src/components/Slider.js",
            hydrateMode: "lazy",
            propsSchema: {},
        },
    ]

    const result = generateClientModule(islands)
    assert.notInclude(result, 'import "/project/src/components/Slider.js";')
    assert.include(result, "observeLazyIslands")
    assert.include(result, '"ph-slider": () => import("/project/src/components/Slider.js")')
})

test("eager/lazy/client-only の混在を正しく分離する", () => {
    const islands: ComponentInfo[] = [
        {
            tagName: "Counter",
            customElementTagName: "ph-counter",
            moduleSpecifier: "/project/src/components/Counter.js",
            hydrateMode: "eager",
            propsSchema: {},
        },
        {
            tagName: "Slider",
            customElementTagName: "ph-slider",
            moduleSpecifier: "/project/src/components/Slider.js",
            hydrateMode: "lazy",
            propsSchema: {},
        },
        {
            tagName: "BrowserInfo",
            customElementTagName: "ph-browser-info",
            moduleSpecifier: "/project/src/components/BrowserInfo.js",
            hydrateMode: "client-only",
            propsSchema: {},
        },
    ]

    const result = generateClientModule(islands)
    assert.include(result, 'import "/project/src/components/Counter.js";')
    assert.include(result, 'import "/project/src/components/BrowserInfo.js";')
    assert.include(result, '"ph-slider": () => import("/project/src/components/Slider.js")')
    assert.include(result, '"Counter": "ph-counter"')
    assert.include(result, '"Slider": "ph-slider"')
    assert.include(result, '"BrowserInfo": "ph-browser-info"')
})

test("空の island リストでも基本構造を生成する", () => {
    const result = generateClientModule([])
    assert.include(result, "@lit-labs/ssr-client/lit-element-hydrate-support.js")
    assert.include(result, "restoreIslandProps")
    assert.include(result, "export const islands = {")
})

