import type { PropsSchema } from "./props/props-filter"

/**
 * サーバーコンポーネント関数の型
 *
 * 同期/非同期の両方をサポートする。
 */
export type ServerComponent = (
    props: Record<string, unknown>,
    children: string,
) => string | Promise<string>

/**
 * レンダラオプション
 */
export interface RenderOptions {
    components?: Record<string, ServerComponent>
    propsSchemas?: Record<string, PropsSchema>
    denyPatterns?: string[]
    authorAttrsMap?: Record<string, Set<string>>
    hydrateComponents?: Map<string, "eager" | "lazy">
    islandTagNames?: Record<string, string>
}

/**
 * レンダリング結果
 */
export interface RenderResult {
    html: string
    hasIslands: boolean
}

/**
 * Document のオプション
 */
export interface DocumentOptions {
    title?: string
    head?: string
    body: string
    hasIslands?: boolean
    islandModules?: string[]
    lang?: string
}
