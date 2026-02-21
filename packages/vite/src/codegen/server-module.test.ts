import { assert, test } from "vitest"
import { generateServerModule } from "./server-module"
import type { ComponentInfo } from "../scanner/types"

// 基本的なサーバーモジュール生成
test("ComponentInfo からサーバー仮想モジュールを生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            hydrateMode: "none",
            customElementTagName: null,
            propsSchema: { title: { type: "string", optional: false } },
        },
        {
            filePath: "/project/src/components/Footer.mdoc.tsx",
            tagName: "Footer",
            hydrateMode: "none",
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
    // hydrate 対象がないので空
    assert.include(result, "export const hydrateComponents = new Map([")
    assert.include(result, "export const islandTagNames = {")
})

// Lit コンポーネント（customElementTagName あり）のテンプレート関数生成
test("Lit コンポーネントのテンプレート関数を生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Counter.mdoc.tsx",
            tagName: "Counter",
            hydrateMode: "eager",
            customElementTagName: "ph-counter",
            propsSchema: { count: { type: "number", optional: false } },
        },
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            hydrateMode: "none",
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    // renderLitTemplate のインポート
    assert.include(result, 'import { renderLitTemplate } from "@pigeonhole/render/lit";')
    // html と unsafeHTML のインポート
    assert.include(result, 'import { html } from "lit";')
    assert.include(result, 'import { unsafeHTML } from "lit/directives/unsafe-html.js";')
    // 副作用インポート（customElements.define 登録）
    assert.include(result, 'import "/project/src/components/Counter.mdoc.tsx";')
    // プロパティバインディングが生成される
    assert.include(result, ".count=${props.count}")
    // renderLitTemplate を deferHydration: true で呼び出す
    assert.include(result, "renderLitTemplate(template, { deferHydration: true })")
    // 関数コンポーネントは既存通り
    assert.include(result, 'import { Card } from "/project/src/components/Card.mdoc.tsx";')
    // components map に両方含まれる
    assert.include(result, "  Counter,")
    assert.include(result, "  Card,")
})

// 複数の props がある場合のバインディング生成
test("複数の props のバインディングを生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Widget.mdoc.tsx",
            tagName: "Widget",
            hydrateMode: "eager",
            customElementTagName: "ph-widget",
            propsSchema: {
                title: { type: "string", optional: false },
                count: { type: "number", optional: false },
                active: { type: "boolean", optional: true },
            },
        },
    ]

    const result = generateServerModule(components)
    assert.include(result, ".title=${props.title}")
    assert.include(result, ".count=${props.count}")
    assert.include(result, ".active=${props.active}")
})

// Lit コンポーネントがない場合は Lit 関連インポートなし
test("Lit コンポーネントがない場合は Lit 関連をインポートしない", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            hydrateMode: "none",
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    assert.notInclude(result, "renderLitTemplate")
    assert.notInclude(result, "import { html }")
    assert.notInclude(result, "unsafeHTML")
})

// 非 hydrate の Lit コンポーネントには deferHydration が含まれない
test("非 hydrate コンポーネントの生成コードに deferHydration が含まれない", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            hydrateMode: "none",
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    assert.notInclude(result, "deferHydration")
})

// SSR-only Lit コンポーネント（customElementTagName あり、hydrateMode: "none"）
test("SSR-only Lit コンポーネントは deferHydration: false で生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Header.mdoc.tsx",
            tagName: "Header",
            hydrateMode: "none",
            customElementTagName: "ph-header",
            propsSchema: { title: { type: "string", optional: false } },
        },
    ]

    const result = generateServerModule(components)
    // Lit 関連インポートがある
    assert.include(result, 'import { renderLitTemplate } from "@pigeonhole/render/lit";')
    // 副作用インポートがある
    assert.include(result, 'import "/project/src/components/Header.mdoc.tsx";')
    // deferHydration: false で呼び出す
    assert.include(result, "renderLitTemplate(template, { deferHydration: false })")
    // deferHydration: true は含まれない
    assert.notInclude(result, "deferHydration: true")
})

// lazy Lit コンポーネントは deferHydration: true で生成する
test("lazy Lit コンポーネントは deferHydration: true で生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Slider.mdoc.tsx",
            tagName: "Slider",
            hydrateMode: "lazy",
            customElementTagName: "ph-slider",
            propsSchema: { index: { type: "number", optional: false } },
        },
    ]

    const result = generateServerModule(components)
    assert.include(result, "renderLitTemplate(template, { deferHydration: true })")
    assert.include(result, ".index=${props.index}")
})

// client-only Lit コンポーネントはスタブ関数を生成する
test("client-only Lit コンポーネントはサーバー import なしでスタブ関数を生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/BrowserInfo.mdoc.tsx",
            tagName: "BrowserInfo",
            hydrateMode: "client-only",
            customElementTagName: "ph-browser-info",
            propsSchema: { ua: { type: "string", optional: false } },
        },
    ]

    const result = generateServerModule(components)
    // サーバー import が生成されない
    assert.notInclude(result, 'import "/project/src/components/BrowserInfo.mdoc.tsx";')
    assert.notInclude(result, "import { BrowserInfo }")
    // スタブ関数が生成される
    assert.include(result, 'const BrowserInfo = () => "";')
    // components マップに含まれる
    assert.include(result, "  BrowserInfo,")
    // renderLitTemplate は呼ばれない
    assert.notInclude(result, "renderLitTemplate")
})

// client-only と他のモードが混在する場合
test("client-only と eager が混在する場合に正しく生成する", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Counter.mdoc.tsx",
            tagName: "Counter",
            hydrateMode: "eager",
            customElementTagName: "ph-counter",
            propsSchema: { count: { type: "number", optional: false } },
        },
        {
            filePath: "/project/src/components/BrowserInfo.mdoc.tsx",
            tagName: "BrowserInfo",
            hydrateMode: "client-only",
            customElementTagName: "ph-browser-info",
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    // eager は通常の Lit SSR パス
    assert.include(result, 'import "/project/src/components/Counter.mdoc.tsx";')
    assert.include(result, "renderLitTemplate(template, { deferHydration: true })")
    // client-only はスタブ
    assert.include(result, 'const BrowserInfo = () => "";')
    assert.notInclude(result, 'import "/project/src/components/BrowserInfo.mdoc.tsx";')
})

// hydrateComponents と islandTagNames のエクスポート
test("hydrateComponents と islandTagNames をエクスポートする", () => {
    const components: ComponentInfo[] = [
        {
            filePath: "/project/src/components/Counter.mdoc.tsx",
            tagName: "Counter",
            hydrateMode: "eager",
            customElementTagName: "ph-counter",
            propsSchema: { count: { type: "number", optional: false } },
        },
        {
            filePath: "/project/src/components/Slider.mdoc.tsx",
            tagName: "Slider",
            hydrateMode: "lazy",
            customElementTagName: "ph-slider",
            propsSchema: {},
        },
        {
            filePath: "/project/src/components/Card.mdoc.tsx",
            tagName: "Card",
            hydrateMode: "none",
            customElementTagName: null,
            propsSchema: {},
        },
    ]

    const result = generateServerModule(components)
    // hydrateComponents: none 以外のみ含まれる
    assert.include(result, "export const hydrateComponents = new Map([")
    assert.include(result, '  ["Counter", "eager"],')
    assert.include(result, '  ["Slider", "lazy"],')
    assert.notInclude(result, '["Card"')
    // islandTagNames: hydrate 対象の Lit コンポーネントのみ
    assert.include(result, "export const islandTagNames = {")
    assert.include(result, '  "Counter": "ph-counter",')
    assert.include(result, '  "Slider": "ph-slider",')
})

// 空のコンポーネントリスト
test("空のコンポーネントリストでは空の components を生成する", () => {
    const result = generateServerModule([])
    assert.include(result, "export const components = {")
    assert.include(result, "};")
})
