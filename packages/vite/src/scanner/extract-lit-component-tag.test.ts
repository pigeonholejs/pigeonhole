import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { assert, test } from "vitest"
import { extractLitComponentTag } from "./extract-lit-component-tag"

function createTempDir(): string {
    const dir = join(
        tmpdir(),
        `pigeonhole-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    mkdirSync(dir, { recursive: true })
    return dir
}

// LIT コンポーネントからタグ名を取得する
test("customElements.define を呼び出すコンポーネントからタグ名を取得する", async () => {
    const dir = createTempDir()
    try {
        const filePath = join(dir, "Counter.ts")
        writeFileSync(
            filePath,
            `
export class CounterElement extends HTMLElement {}
customElements.define("ph-counter-lit", CounterElement)
`,
        )
        const tagName = await extractLitComponentTag(filePath)
        assert.equal(tagName, "ph-counter-lit")
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})

// @customElement デコレータなしのコンポーネントは null を返す
test("customElements.define を呼び出さないコンポーネントは null を返す", async () => {
    const dir = createTempDir()
    try {
        const filePath = join(dir, "Card.ts")
        writeFileSync(
            filePath,
            `
export function Card(props: { title: string }): string {
    return "<div>" + props.title + "</div>"
}
`,
        )
        const tagName = await extractLitComponentTag(filePath)
        assert.isNull(tagName)
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})

// 存在しないファイルは null を返す
test("インポートに失敗した場合は null を返す", async () => {
    const tagName = await extractLitComponentTag("/nonexistent/path/Component.ts")
    assert.isNull(tagName)
})

// 複数のエクスポートがあっても正しいタグ名を取得する
test("複数のエクスポートがある場合でも登録されたタグ名を返す", async () => {
    const dir = createTempDir()
    try {
        const filePath = join(dir, "MultiExport.ts")
        writeFileSync(
            filePath,
            `
export interface MultiExportProps { value: string }
export function helper(x: string): string { return x }
export class MultiExportElement extends HTMLElement {}
customElements.define("ph-multi-export", MultiExportElement)
`,
        )
        const tagName = await extractLitComponentTag(filePath)
        assert.equal(tagName, "ph-multi-export")
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})
