/**
 * コンポーネントの props スキーマにおけるプロパティ定義。
 */
export interface PropsDef {
    type: string
}

/**
 * コンポーネントの props スキーマ型。
 * 例: { title: { type: "string" }, count: { type: "number" } }
 */
export type PropsSchema = Record<string, PropsDef>
