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

// アイランドコンポーネントの検出
test("use client 付きコンポーネントを island として検出する", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "Counter.mdoc.tsx"),
            `"use client"

interface CounterProps {
    count: number;
}

@customElement("ph-counter")
export class CounterElement extends LitElement {}
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
