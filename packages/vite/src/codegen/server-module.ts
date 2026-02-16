import { normalizePath } from "vite"
import type { ComponentInfo } from "../scanner/types"

// サーバー仮想モジュール (virtual:pigeonhole/components) を生成する
export function generateServerModule(components: ComponentInfo[]): string {
    const lines: string[] = []

    for (const component of components) {
        const path = normalizePath(component.filePath)
        lines.push(`import { ${component.tagName} } from "${path}";`)
    }

    lines.push("")
    lines.push("export const components = {")
    for (const component of components) {
        lines.push(`  ${component.tagName},`)
    }
    lines.push("};")
    lines.push("")

    return lines.join("\n")
}
