import type { HydrateMode } from "../component/types"
import type { ComponentInfo } from "../component/types"

// サーバー仮想モジュール (virtual:pigeonhole/components) を生成する
export function generateServerModule(components: ComponentInfo[]): string {
    const lines: string[] = []
    const hasRenderableComponents = components.some((c) => c.hydrateMode !== "client-only")

    if (hasRenderableComponents) {
        lines.push('import { renderLitTemplate } from "@pigeonhole/render/lit";')
        lines.push('import { html, nothing } from "lit";')
        lines.push('import { unsafeHTML } from "lit/directives/unsafe-html.js";')
        lines.push("")
    }

    for (const component of components) {
        if (component.hydrateMode === "client-only") {
            lines.push(`const ${component.tagName} = () => "";`)
            continue
        }

        lines.push(`import "${component.moduleSpecifier}";`)
        lines.push(
            generateLitSsrFunction(
                component.tagName,
                component.customElementTagName,
                Object.keys(component.propsSchema),
                component.hydrateMode,
            ),
        )
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

    const hydrateEntries = components.filter((c) => c.hydrateMode !== "none")
    lines.push("export const hydrateComponents = new Map([")
    for (const component of hydrateEntries) {
        lines.push(`  ["${component.tagName}", "${component.hydrateMode}"],`)
    }
    lines.push("]);")
    lines.push("")

    const islandEntries = components.filter((c) => c.hydrateMode !== "none")
    lines.push("export const islandTagNames = {")
    for (const component of islandEntries) {
        lines.push(`  "${component.tagName}": "${component.customElementTagName}",`)
    }
    lines.push("};")
    lines.push("")

    return lines.join("\n")
}

function generateLitSsrFunction(
    componentName: string,
    tagName: string,
    propNames: string[],
    hydrateMode: HydrateMode,
): string {
    const propBindings = propNames.map((name) => `\n    .${name}=\${props.${name}}`).join("")

    return [
        `const ${componentName} = async (props, children) => {`,
        `  const template = html\`<${tagName}${propBindings}`,
        `  slot=\${props.slot ?? nothing}`,
        `  >\${unsafeHTML(children || '')}</${tagName}>\`;`,
        `  return renderLitTemplate(template, { deferHydration: ${hydrateMode !== "none"} });`,
        `};`,
    ].join("\n")
}
