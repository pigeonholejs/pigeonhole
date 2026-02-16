// "use client" ディレクティブを検出する
export function detectUseClient(source: string): boolean {
    // コメント行で始まる場合は検出しない
    if (source.startsWith("//") || source.startsWith("/*")) {
        return false
    }
    return source.startsWith('"use client"') || source.startsWith("'use client'")
}
