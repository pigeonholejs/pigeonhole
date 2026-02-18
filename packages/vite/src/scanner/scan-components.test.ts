import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { assert, test } from "vitest"
import { scanComponents } from "./scan-components"

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

// 基本的なコンポーネントスキャン
test("*.mdoc.tsx ファイルを走査して ComponentInfo を返す", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "Card.mdoc.tsx"),
            `interface CardProps {
    title: string;
}

export function Card(props: CardProps, children: string): string {
    return "<div>" + children + "</div>";
}
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 1)
        assert.equal(results[0].tagName, "Card")
        assert.isFalse(results[0].isIsland)
        assert.isNull(results[0].customElementTagName)
        assert.deepEqual(results[0].propsSchema, { title: { type: "string", optional: false } })
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// Island detection based on customElements registration
test("@customElement 付きコンポーネントを island として検出する", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "Counter.mdoc.tsx"),
            `interface CounterProps {
    count: number;
}

export class CounterElement extends HTMLElement {}
customElements.define("ph-counter", CounterElement)
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 1)
        assert.isTrue(results[0].isIsland)
        assert.equal(results[0].customElementTagName, "ph-counter")
        assert.equal(results[0].tagName, "Counter")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// サブディレクトリの再帰走査
test("サブディレクトリを再帰的に走査する", async () => {
    const root = createTempDir()
    try {
        const subDir = join(root, "src/components/shared")
        mkdirSync(subDir, { recursive: true })

        writeFileSync(
            join(subDir, "Button.mdoc.tsx"),
            `interface ButtonProps {
    label: string;
}

export function Button(props: ButtonProps, children: string): string {
    return "<button>" + children + "</button>";
}
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 1)
        assert.equal(results[0].tagName, "Button")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// export 命名規約違反
test("export 命名規約に違反するファイルはエラーを投げる", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "Card.mdoc.tsx"),
            `export function WrongName(props: {}, children: string): string {
    return "<div>" + children + "</div>";
}
`,
        )

        try {
            await scanComponents(root, "src/components")
            assert.fail("エラーが投げられるべき")
        } catch (error) {
            assert.include((error as Error).message, "export naming convention violation")
        }
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// コンポーネントディレクトリが存在しない場合
test("コンポーネントディレクトリが存在しない場合は空配列を返す", async () => {
    const root = createTempDir()
    try {
        const results = await scanComponents(root, "src/components")
        assert.deepEqual(results, [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// SSR component detection (no island)
test("SSR: 関数コンポーネントは island として検出されない", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "Greeting.mdoc.tsx"),
            `interface GreetingProps {
    name: string;
}

export function Greeting(props: GreetingProps): string {
    return \`<p>Hello, \${props.name}!</p>\`;
}
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 1)
        assert.equal(results[0].tagName, "Greeting")
        assert.isFalse(results[0].isIsland, "SSR component should NOT be an island")
        assert.isNull(results[0].customElementTagName, "SSR component should NOT have customElementTagName")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// CSR/Island component detection with customElements registration
test("CSR/ISLAND: @customElement 付き Lit コンポーネントは island として検出される", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "Interactive.mdoc.tsx"),
            `interface InteractiveProps {
    value: string;
}

export class InteractiveElement extends HTMLElement {
    value = "";
}
customElements.define("ph-interactive", InteractiveElement)
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 1)
        assert.equal(results[0].tagName, "Interactive")
        assert.isTrue(results[0].isIsland, "CSR component with @customElement should be an island")
        assert.equal(results[0].customElementTagName, "ph-interactive", "Should extract custom element tag name")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// Ensure old "use client" directive is ignored (no false positive)
test("HYDRATION: 旧 'use client' ディレクティブは無視され、@customElement のみで判定される", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        // Component with "use client" but without @customElement should NOT be island
        writeFileSync(
            join(componentsDir, "Legacy.mdoc.tsx"),
            `"use client"

interface LegacyProps {
    text: string;
}

export function Legacy(props: LegacyProps): string {
    return \`<span>\${props.text}</span>\`;
}
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 1)
        assert.equal(results[0].tagName, "Legacy")
        assert.isFalse(results[0].isIsland, '"use client" without @customElement should NOT be an island')
        assert.isNull(results[0].customElementTagName, "Should not have custom element tag name")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// Test multiple components with mixed SSR and Island types
test("SSR + ISLAND: 混在したコンポーネントを正しく分類する", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        // SSR component
        writeFileSync(
            join(componentsDir, "Header.mdoc.tsx"),
            `interface HeaderProps {
    title: string;
}

export function Header(props: HeaderProps): string {
    return \`<header><h1>\${props.title}</h1></header>\`;
}
`,
        )

        // Island component
        writeFileSync(
            join(componentsDir, "SearchBox.mdoc.tsx"),
            `export class SearchBoxElement extends HTMLElement {}
customElements.define("ph-search-box", SearchBoxElement)
`,
        )

        // Another SSR component
        writeFileSync(
            join(componentsDir, "Footer.mdoc.tsx"),
            `export function Footer(): string {
    return \`<footer>Copyright 2026</footer>\`;
}
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 3)

        const header = results.find((r) => r.tagName === "Header")
        const searchBox = results.find((r) => r.tagName === "SearchBox")
        const footer = results.find((r) => r.tagName === "Footer")

        assert.isDefined(header)
        assert.isDefined(searchBox)
        assert.isDefined(footer)

        assert.isFalse(header!.isIsland, "Header should be SSR only")
        assert.isTrue(searchBox!.isIsland, "SearchBox should be an island")
        assert.isFalse(footer!.isIsland, "Footer should be SSR only")

        assert.isNull(header!.customElementTagName)
        assert.equal(searchBox!.customElementTagName, "ph-search-box")
        assert.isNull(footer!.customElementTagName)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// Edge case: customElements.define with single quotes
test("ISLAND: シングルクォートの @customElement も正しく検出される", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "SingleQuote.mdoc.tsx"),
            `export class SingleQuoteElement extends HTMLElement {}
customElements.define('ph-single-quote', SingleQuoteElement)
`,
        )

        const results = await scanComponents(root, "src/components")
        assert.equal(results.length, 1)
        assert.isTrue(results[0].isIsland, "Component with single quote @customElement should be island")
        assert.equal(results[0].customElementTagName, "ph-single-quote")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
