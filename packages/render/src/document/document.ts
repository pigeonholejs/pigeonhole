import type { DocumentOptions } from "../types"

/**
 * クライアントブートストラップスクリプトを生成する
 *
 * @param islandModules - eager import するアイランドモジュールパスの配列
 * @returns script タグ文字列
 */
export function buildBootstrapScript(islandModules?: string[]): string {
    const lines: string[] = [
        '<script type="module">',
        'import "@lit-labs/ssr-client/lit-element-hydrate-support.js";',
        'import { restoreIslandProps } from "@pigeonhole/render/client";',
        "restoreIslandProps();",
    ]

    // アイランドモジュールを eager import
    if (islandModules) {
        for (const modulePath of islandModules) {
            lines.push(`import "${modulePath}";`)
        }
    }

    lines.push("</script>")
    return lines.join("")
}

/**
 * 完全な HTML ドキュメントを生成する
 *
 * アイランドがある場合のみクライアントブートストラップを挿入する。
 *
 * @param options - ドキュメント生成オプション
 * @returns 完全な HTML 文字列
 */
export function createDocument(options: DocumentOptions): string {
    const { title, head, body, hasIslands, islandModules, lang = "en" } = options
    const titleTag = title !== undefined ? `<title>${title}</title>` : ""
    const headContent = head ?? ""
    const bootstrapScript = hasIslands === true ? buildBootstrapScript(islandModules) : ""

    return [
        "<!doctype html>",
        `<html lang="${lang}">`,
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        titleTag,
        headContent,
        "</head>",
        "<body>",
        body,
        bootstrapScript,
        "</body>",
        "</html>",
    ].join("")
}
