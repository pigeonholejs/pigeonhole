import type { PropsSchema } from "@pigeonhole/render"

// コンポーネント情報
export interface ComponentInfo {
    filePath: string
    tagName: string
    isIsland: boolean
    customElementTagName: string[]
    propsSchema: PropsSchema
}

// .mdoc ファイル情報
export interface MdocFileInfo {
    filePath: string
    imports: { path: string }[]
    inputs: { variableName: string }[]
    tagAttributes: Record<string, string[]>
}
