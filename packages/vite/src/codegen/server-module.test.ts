import { assert, test } from "vitest"
import { generateServerModule } from "./server-module"
import type { ComponentInfo } from "../component/types"

test("Web Components からサーバー仮想モジュールを生成する", () => {
    const components: ComponentInfo[] = [
        {
            tagName: "Counter",
            customElementTagName: "ph-counter",
            moduleSpecifier: "/project/src/components/Counter.js",
            hydrateMode: "eager",
            propsSchema: { count: { type: "number" } },
        },
    ]

    const result = generateServerModule(components)
    assert.include(result, 'import "/project/src/components/Counter.js";')
    assert.include(result, ".count=${props.count}")
    assert.include(result, "renderLitTemplate(template, { deferHydration: true })")
    assert.include(result, '"Counter": "ph-counter"')
})

test("SSR-only コンポーネントは deferHydration: false で生成する", () => {
    const components: ComponentInfo[] = [
        {
            tagName: "Header",
            customElementTagName: "ph-header",
            moduleSpecifier: "/project/src/components/Header.js",
            hydrateMode: "none",
            propsSchema: { title: { type: "string" } },
        },
    ]

    const result = generateServerModule(components)
    assert.include(result, "renderLitTemplate(template, { deferHydration: false })")
    assert.include(result, '  Header: {"title":{"type":"string"}},')
    assert.notInclude(result, '"Header": "ph-header"')
})

test("client-only コンポーネントはスタブ関数を生成する", () => {
    const components: ComponentInfo[] = [
        {
            tagName: "BrowserInfo",
            customElementTagName: "ph-browser-info",
            moduleSpecifier: "/project/src/components/BrowserInfo.js",
            hydrateMode: "client-only",
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    assert.include(result, 'const BrowserInfo = () => "";')
    assert.notInclude(result, 'import "/project/src/components/BrowserInfo.js";')
    assert.include(result, '  ["BrowserInfo", "client-only"],')
})

test("複数モードを含む hydrateComponents と islandTagNames を生成する", () => {
    const components: ComponentInfo[] = [
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
            tagName: "Header",
            customElementTagName: "ph-header",
            moduleSpecifier: "/project/src/components/Header.js",
            hydrateMode: "none",
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    assert.include(result, '  ["Counter", "eager"],')
    assert.include(result, '  ["Slider", "lazy"],')
    assert.notInclude(result, '["Header", "none"]')
    assert.include(result, '  "Counter": "ph-counter",')
    assert.include(result, '  "Slider": "ph-slider",')
    assert.notInclude(result, '"Header": "ph-header"')
})

