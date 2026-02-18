// @customElement デコレータからタグ名を抽出する
export function extractCustomElementTag(source: string): string[] {
    const match = /@customElement\(\s*["']([^"']+)["']\s*\)/.exec(source)
    if (!match) {
        return []
    }
    return [match[1]]
}
