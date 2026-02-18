import { normalizePath } from "vite"
import type { HydrateMode } from "../scanner/extract-hydrate-mode"
import type { ComponentInfo } from "../scanner/types"

// サーバー仮想モジュール (virtual:pigeonhole/components) を生成する
export function generateServerModule(components: ComponentInfo[]): string {
    const lines: string[] = []
    const hasLitComponents = components.some((c) => c.customElementTagName !== null)

    if (hasLitComponents) {
        lines.push('import { renderLitTemplate } from "@pigeonhole/render/lit";')
        lines.push('import { html } from "lit";')
        lines.push('import { unsafeHTML } from "lit/directives/unsafe-html.js";')
        lines.push("")
    }

    for (const component of components) {
        const path = normalizePath(component.filePath)
        if (component.customElementTagName !== null) {
            // Lit: 副作用インポート（customElements.define）+ テンプレート関数生成
            lines.push(`import "${path}";`)
            lines.push(
                generateLitSsrFunction(
                    component.tagName,
                    component.customElementTagName,
                    Object.keys(component.propsSchema),
                    component.hydrateMode,
                ),
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

/** Lit コンポーネントの SSR 関数をコード生成する */
function generateLitSsrFunction(
    componentName: string,
    tagName: string,
    propNames: string[],
    hydrateMode: HydrateMode,
): string {
    const propBindings = propNames
        .map((name) => `\n    .${name}=\${props.${name}}`)
        .join("")

    return [
        `const ${componentName} = async (props, children) => {`,
        `  const template = html\`<${tagName}${propBindings}`,
        `  >\${unsafeHTML(children || '')}</${tagName}>\`;`,
        `  return renderLitTemplate(template, { deferHydration: ${hydrateMode === "eager"} });`,
        `};`,
    ].join("\n")
}
