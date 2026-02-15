import { matchesDenyPattern } from "./deny-pattern"

/**
 * コンポーネントのpropsスキーマ型。
 * キー末尾の ? はオプショナルを表現する。
 * 例: { "title": "string", "count?": "number" }
 */
export type PropsSchema = Record<string, string>

/**
 * filterPropsの入力
 */
export interface FilterPropsInput {
    /** Markdocタグのraw attrs */
    attrs: Record<string, unknown>
    /** コンポーネントのpropsスキーマ */
    schema: PropsSchema
    /** 著者が明示記述した属性のキー集合 */
    authorAttrs: Set<string>
    /** authorInputPolicy.denyパターン */
    denyPatterns: string[]
    /** レンダリング済みchildren */
    renderedChildren?: string
}

/**
 * Propsをallow-listフィルタで検証・フィルタリングする。
 * schemaに宣言されたキーのみ通し、未宣言キーは破棄する。
 * authorAttrsに含まれるキーがschema未宣言またはdenyパターン一致の場合はエラーを投げる。
 */
export function filterProps(input: FilterPropsInput): Record<string, unknown> {
    const { attrs, schema, authorAttrs, denyPatterns, renderedChildren } = input

    // スキーマキーからオプショナルマーカー（?）を除去した正規化セットを構築する
    const normalizedSchemaKeys = new Set<string>()
    for (const key of Object.keys(schema)) {
        const baseName = key.endsWith("?") ? key.slice(0, -1) : key
        normalizedSchemaKeys.add(baseName)
    }

    const sanitized: Record<string, unknown> = {}

    // authorAttrsの各キーについて、schema未宣言キーがあれば即エラー
    for (const key of authorAttrs) {
        if (!normalizedSchemaKeys.has(key)) {
            throw new Error(`undeclared attribute "${key}" is not defined in component schema`)
        }
    }

    // authorAttrsの各キーについて、denyパターン一致があれば即エラー
    for (const key of authorAttrs) {
        if (matchesDenyPattern(key, denyPatterns)) {
            throw new Error(`denied attribute "${key}" matches authorInputPolicy.deny pattern`)
        }
    }

    // schemaの各キーについてattrsに存在すればsanitizedにコピー
    for (const key of normalizedSchemaKeys) {
        if (key === "children") {
            continue
        }
        if (key in attrs) {
            sanitized[key] = attrs[key]
        }
    }

    // schemaにchildrenがある場合のみrenderedChildrenを設定
    if (normalizedSchemaKeys.has("children") && renderedChildren !== undefined) {
        sanitized.children = renderedChildren
    }

    return sanitized
}
