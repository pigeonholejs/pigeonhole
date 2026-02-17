export type { ServerComponent, RenderMode } from "@pigeonhole/render"
import type { PropsSchema } from "@pigeonhole/render"

/**
 * renderMdoc に渡すオプション
 */
export interface RenderMdocOptions {
    /** コンポーネント map */
    components?: Record<string, import("@pigeonhole/render").ServerComponent>
    /** レンダリングモード */
    mode?: import("@pigeonhole/render").RenderMode
    /** propsSchemas（@pigeonhole/render に委譲） */
    propsSchemas?: Record<string, PropsSchema>
    /** 著者属性 map（@pigeonhole/render に委譲） */
    authorAttrsMap?: Record<string, Set<string>>
    /** deny パターン（@pigeonhole/render に委譲） */
    denyPatterns?: string[]
    /** island コンポーネント名の集合 */
    islandComponents?: Set<string>
    /** island タグ名マッピング */
    islandTagNames?: Record<string, string>
}

/**
 * レンダリング結果
 */
export interface RenderPageResult {
    html: string
    hasIslands: boolean
}
