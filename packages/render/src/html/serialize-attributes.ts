import { escapeAttribute } from "./escape"

/**
 * 属性をシリアライズする
 *
 * - null/undefined/false → スキップ
 * - true → 属性名のみ
 * - string → エスケープして出力
 * - number → 文字列化してエスケープして出力
 * - その他 → スキップ
 */
export function serializeAttributes(attributes: Record<string, unknown>): string {
    const parts: string[] = []

    for (const [key, value] of Object.entries(attributes)) {
        if (value === null || value === undefined || value === false) {
            continue
        }

        if (value === true) {
            parts.push(key)
            continue
        }

        /**
         * 属性値は文字列または数値のみ対応する。
         * オブジェクト型は適切な文字列化ができないためスキップする。
         */
        if (typeof value === "string") {
            parts.push(`${key}="${escapeAttribute(value)}"`)
        } else if (typeof value === "number") {
            parts.push(`${key}="${escapeAttribute(value.toString(10))}"`)
        }
    }

    if (parts.length === 0) {
        return ""
    }

    return ` ${parts.join(" ")}`
}
