import type { PropsSchema } from "@pigeonhole/render"
import type { HydrateMode } from "./extract-hydrate-mode"

// コンポーネント情報
export interface ComponentInfo {
    filePath: string
    tagName: string
    hydrateMode: HydrateMode
    customElementTagName: string | null
    propsSchema: PropsSchema
}

// .mdoc ファイル情報
export interface MdocFileInfo {
    filePath: string
    imports: { path: string }[]
    inputs: { variableName: string }[]
    tagAttributes: Record<string, string[]>
}
