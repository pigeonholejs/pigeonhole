export interface MdocFileInfo {
    filePath: string
    imports: { path: string }[]
    inputs: { variableName: string }[]
    tagAttributes: Record<string, string[]>
}

