export interface MdocTagUsage {
    attributes: string[]
    hasChildren: boolean
}

export interface MdocFileInfo {
    filePath: string
    imports: { path: string }[]
    inputs: { variableName: string }[]
    tagUsages: Record<string, MdocTagUsage>
}
