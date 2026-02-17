import { matchesDenyPattern } from "./deny-pattern"

/**
 * コンポーネントの props スキーマにおけるプロパティ定義。
 */
export interface PropsDef {
    type: string
    optional: boolean
}

/**
 * コンポーネントの props スキーマ型。
 * 例: { title: { type: "string", optional: false }, count: { type: "number", optional: true } }
 */
export type PropsSchema = Record<string, PropsDef>

/**
 * filterProps の入力
 */
export interface FilterPropsInput {
    /** Markdoc タグの raw attrs */
    attrs: Record<string, unknown>
    /** コンポーネントの props スキーマ */
    schema: PropsSchema
    /** 著者が明示記述した属性のキー集合 */
    authorAttrs: Set<string>
    /** authorInputPolicy.deny パターン */
    denyPatterns: string[]
    /** レンダリング済み children */
    renderedChildren?: string
}

/**
 * Props を allow-list フィルタで検証・フィルタリングする。
 * schema に宣言されたキーのみ通し、未宣言キーは破棄する。
 * authorAttrs に含まれるキーが schema 未宣言または deny パターン一致の場合はエラーを投げる。
 */
export function filterProps(input: FilterPropsInput): Record<string, unknown> {
    const { attrs, schema, authorAttrs, denyPatterns, renderedChildren } = input

    const schemaKeys = new Set(Object.keys(schema))

    const sanitized: Record<string, unknown> = {}

    // authorAttrs の各キーについて、schema 未宣言キーがあれば即エラー
    for (const key of authorAttrs) {
        if (!schemaKeys.has(key)) {
            throw new Error(`undeclared attribute "${key}" is not defined in component schema`)
        }
    }

    // authorAttrs の各キーについて、deny パターン一致があれば即エラー
    for (const key of authorAttrs) {
        if (matchesDenyPattern(key, denyPatterns)) {
            throw new Error(`denied attribute "${key}" matches authorInputPolicy.deny pattern`)
        }
    }

    // schema の各キーについて attrs に存在すれば sanitized にコピー
    for (const key of schemaKeys) {
        if (key === "children") {
            continue
        }
        if (key in attrs) {
            sanitized[key] = attrs[key]
        }
    }

    // schema に children がある場合のみ renderedChildren を設定
    if (schemaKeys.has("children") && renderedChildren !== undefined) {
        sanitized.children = renderedChildren
    }

    return sanitized
}
