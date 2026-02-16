// @customElement デコレータからタグ名を抽出する
export function extractCustomElementTag(source: string): string | null {
    const match = /@customElement\(\s*["']([^"']+)["']\s*\)/.exec(source)
    if (!match) {
        return null
    }
    return match[1]
}
