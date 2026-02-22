import type { PropsSchema } from "@pigeonhole/contracts"
import type { RenderableTreeNode } from "strictmdoc"

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
 * レンダリング結果
 */
export interface RenderResult {
    html: string
    hasIslands: boolean
}

/**
 * renderToHtml のオプション
 */
export interface RenderOptions {
    components?: Record<string, ServerComponent>
    hydrateComponents?: Map<string, "eager" | "lazy" | "client-only">
    islandTagNames?: Record<string, string>
}

/**
 * renderMdoc のオプション
 */
export interface RenderMdocOptions {
    components?: Record<string, ServerComponent>
    propsSchemas?: Record<string, PropsSchema>
    denyPatterns?: string[]
    hydrateComponents?: Map<string, "eager" | "lazy" | "client-only">
    islandTagNames?: Record<string, string>
    mdoc?: {
        sourcePath?: string
        resolveImport?: MdocImportResolver
    }
}

export type MdocImportResolution = {
    id: string
    source: string
}

export type MdocImportResolver = (
    specifier: string,
    importerPath?: string,
) => Promise<MdocImportResolution | null>

export type MdocSlotChildren = RenderableTreeNode | RenderableTreeNode[] | null

/**
 * Document のオプション
 */
export interface DocumentOptions {
    title?: string
    head?: string
    body: string
    hasIslands?: boolean
    lang?: string
}

/**
 * リクエストスコープのレンダリングコンテキスト
 */
export interface RenderContext {
    islandCounter: number
}

/**
 * Lit SSR オプション
 */
export interface RenderLitOptions {
    deferHydration?: boolean
}
