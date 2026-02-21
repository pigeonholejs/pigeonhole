import type { DocumentOptions } from "../types"

/**
 * クライアントブートストラップスクリプトタグを生成する
 *
 * .pigeonhole/client-entry.js を外部スクリプトとして読み込む。
 * client-entry.js は virtual:pigeonhole/client を import し、
 * Vite がモジュールリクエストとして処理することで virtual module 解決が動く。
 *
 * @returns script タグ文字列
 */
export function buildBootstrapScript(): string {
    return '<script type="module" src="/.pigeonhole/client-entry.js"></script>'
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
    const { title, head, body, hasIslands, lang = "en" } = options
    const titleTag = title !== undefined ? `<title>${title}</title>` : ""
    const headContent = head ?? ""
    const bootstrapScript = hasIslands === true ? buildBootstrapScript() : ""

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
