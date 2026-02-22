import type { ComponentInfo } from "../component/types"

// コンポーネントの props インターフェースを生成する
function generatePropsInterface(component: ComponentInfo): string {
    const lines: string[] = []
    lines.push(`  interface ${component.tagName}Props {`)

    for (const [key, def] of Object.entries(component.propsSchema)) {
        const quotedKey = /[^a-zA-Z0-9_$]/.test(key) ? `"${key}"` : key
        lines.push(`    ${quotedKey}: ${def.type};`)
    }

    lines.push("  }")
    return lines.join("\n")
}

// .pigeonhole/types.d.ts の内容を生成する
export function generateTypeDefinitions(components: ComponentInfo[]): string {
    const lines: string[] = []

    lines.push("// このファイルは pigeonhole vite プラグインにより自動生成されます")
    lines.push("// 手動で編集しないでください")
    lines.push("")
    lines.push("declare namespace Pigeonhole {")

    for (const component of components) {
        if (Object.keys(component.propsSchema).length > 0) {
            lines.push(generatePropsInterface(component))
            lines.push("")
        }
    }

    lines.push("}")
    lines.push("")

    return lines.join("\n")
}

// .pigeonhole/virtual-modules.d.ts の内容を生成する
export function generateVirtualModuleTypes(): string {
    const lines: string[] = []

    lines.push("// このファイルは pigeonhole vite プラグインにより自動生成されます")
    lines.push("// 手動で編集しないでください")
    lines.push("")
    lines.push('declare module "virtual:pigeonhole/components" {')
    lines.push(
        "  export const components: Record<string, (props: Record<string, unknown>, children: string) => string | Promise<string>>;",
    )
    lines.push(
        '  export const propsSchemas: Record<string, import("@pigeonhole/contracts").PropsSchema>;',
    )
    lines.push('  export const hydrateComponents: Map<string, "eager" | "lazy" | "client-only">;')
    lines.push("  export const islandTagNames: Record<string, string>;")
    lines.push("}")
    lines.push("")
    lines.push('declare module "virtual:pigeonhole/client" {')
    lines.push("  export const islands: Record<string, string>;")
    lines.push("}")
    lines.push("")

    return lines.join("\n")
}
