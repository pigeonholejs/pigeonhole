import "@lit-labs/ssr/lib/install-global-dom-shim.js"
import { render } from "@lit-labs/ssr"
import { collectResult } from "@lit-labs/ssr/lib/render-result.js"

export interface RenderLitOptions {
    deferHydration?: boolean
}

/**
 * Lit テンプレートを SSR レンダリングして HTML 文字列を返す
 *
 * `render()` 公開 API を使用し、外側タグ・DSD・hydration コメント・
 * defer-hydration 属性を含む完全な HTML を出力する。
 */
export async function renderLitTemplate(
    template: unknown,
    options?: RenderLitOptions,
): Promise<string> {
    return collectResult(
        render(template as Parameters<typeof render>[0], {
            deferHydration: options?.deferHydration ?? false,
        }),
    )
}
