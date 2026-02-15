/**
 * 属性名がdenyパターンリストに一致するか判定する。
 * - 完全一致: "class", "style", "id"
 * - ワイルドカード: "on-*" (末尾 * でプレフィックスマッチ)
 */
export function matchesDenyPattern(attributeName: string, denyPatterns: string[]): boolean {
    for (const pattern of denyPatterns) {
        if (pattern.endsWith("*")) {
            /**
             * ワイルドカードパターン: 末尾の * を除いたプレフィックスで比較
             */
            const prefix = pattern.slice(0, -1)
            if (attributeName.startsWith(prefix)) {
                return true
            }
        } else if (attributeName === pattern) {
            /**
             * 完全一致パターン
             */
            return true
        }
    }

    return false
}
