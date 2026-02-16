// export された function / class / const の名前を抽出する
// export type / export interface は対象外
export function extractExportNames(source: string): string[] {
    const exportRegex = /export\s+(?:function|class|const)\s+(\w+)/g
    const names: string[] = []
    let match = exportRegex.exec(source)
    while (match !== null) {
        names.push(match[1])
        match = exportRegex.exec(source)
    }
    return names
}
