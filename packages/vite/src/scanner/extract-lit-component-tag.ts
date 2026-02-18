// LIT コンポーネントを動的インポートして customElements レジストリからタグ名を取得する
import { createJiti } from "jiti"

// CustomElementRegistry の最小インターフェース
interface CustomElementRegistryLike {
    getName(constructor: unknown): string | null
}

// jiti インスタンスはモジュールレベルで一度だけ生成する
const jiti = createJiti(import.meta.url)

// DOM シムのインストールをプロミスで管理し、複数回呼び出しによる競合を防ぐ
let domShimPromise: Promise<void> | null = null

function ensureDomShim(): Promise<void> {
    if (domShimPromise === null) {
        domShimPromise = import("@lit-labs/ssr/lib/install-global-dom-shim.js").then(() => undefined)
    }
    return domShimPromise
}

function getRegistry(): CustomElementRegistryLike | null {
    return (
        ((globalThis as Record<string, unknown>).customElements as CustomElementRegistryLike) ?? null
    )
}

/**
 * LIT コンポーネントファイルを動的インポートして、
 * customElements レジストリからタグ名を取得する
 */
export async function extractLitComponentTag(filePath: string): Promise<string | null> {
    try {
        await ensureDomShim()
    } catch {
        // @lit-labs/ssr が利用できない場合は null を返す
        return null
    }

    const registry = getRegistry()
    if (!registry) return null

    let mod: Record<string, unknown>

    try {
        mod = (await jiti.import(filePath)) as Record<string, unknown>
    } catch {
        // インポートに失敗した場合は null を返す
        return null
    }

    for (const value of Object.values(mod)) {
        if (typeof value !== "function") continue
        const tagName = registry.getName(value)
        if (tagName !== null) {
            return tagName
        }
    }

    return null
}
