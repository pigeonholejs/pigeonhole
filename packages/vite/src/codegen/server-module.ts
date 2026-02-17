import { normalizePath } from "vite"
import type { ComponentInfo } from "../scanner/types"

// サーバー仮想モジュール (virtual:pigeonhole/components) を生成する
export function generateServerModule(components: ComponentInfo[]): string {
    const lines: string[] = []
    const hasLitComponents = components.some((c) => c.customElementTagName !== null)

    if (hasLitComponents) {
        lines.push('import { createLitBridge } from "@pigeonhole/render/lit";')
        lines.push("")
    }

    for (const component of components) {
        const path = normalizePath(component.filePath)
        if (component.customElementTagName !== null) {
            // Lit: クラスをインポートしてブリッジでラップ
            lines.push(
                `import { ${component.tagName} as _${component.tagName}Class } from "${path}";`,
            )
            lines.push(
                `const ${component.tagName} = createLitBridge(_${component.tagName}Class, "${component.customElementTagName}");`,
            )
        } else {
            // 関数コンポーネント: 既存通り
            lines.push(`import { ${component.tagName} } from "${path}";`)
        }
    }

    lines.push("")
    lines.push("export const components = {")
    for (const component of components) {
        lines.push(`  ${component.tagName},`)
    }
    lines.push("};")
    lines.push("")

    lines.push("export const propsSchemas = {")
    for (const component of components) {
        lines.push(`  ${component.tagName}: ${JSON.stringify(component.propsSchema)},`)
    }
    lines.push("};")
    lines.push("")

    return lines.join("\n")
}
