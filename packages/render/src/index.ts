// Types
export type {
    ServerComponent,
    RenderOptions,
    RenderResult,
    RenderMdocOptions,
    DocumentOptions,
    RenderContext,
} from "./types"
export type { PropsSchema, PropsDef } from "@pigeonhole/contracts"

// Re-exports from markdecl
export { Tag } from "markdecl"
export type { RenderableTreeNode } from "markdecl"

// HTML rendering
export { renderToHtml } from "./html/render-to-html"
export { escapeHtml, escapeAttribute } from "./html/escape"

// Markdoc rendering
export { renderMdoc } from "./mdoc/render-mdoc"

// Island system
export { PH_ISLAND_ID_ATTR, PH_ISLAND_PROPS_PREFIX, PH_HYDRATE_ATTR } from "./island/constants"
export { createRenderContext, serializeIslandProps, wrapIslandHtml } from "./island/marker"

// Document
export { createDocument } from "./document/document"

// Props
export { matchesDenyPattern } from "@pigeonhole/contracts"
