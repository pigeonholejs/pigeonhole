import type { ComponentInfo } from "../component/types"

// クライアント仮想モジュール (virtual:pigeonhole/client) を生成する
export function generateClientModule(islands: ComponentInfo[]): string {
    const eagerIslands = islands.filter((i) => i.hydrateMode === "eager")
    const lazyIslands = islands.filter((i) => i.hydrateMode === "lazy")
    const clientOnlyIslands = islands.filter((i) => i.hydrateMode === "client-only")
    const lines: string[] = []

    // hydrate support
    lines.push('import "@lit-labs/ssr-client/lit-element-hydrate-support.js";')
    lines.push("")

    // restoreIslandProps（eager 用）
    lines.push('import { restoreIslandProps } from "@pigeonhole/render/client";')
    lines.push("restoreIslandProps();")
    lines.push("")

    // eager / client-only island: 即座に import
    for (const island of [...eagerIslands, ...clientOnlyIslands]) {
        lines.push(`import "${island.moduleSpecifier}";`)
    }
    lines.push("")

    // lazy island: observeLazyIslands + dynamic import
    if (lazyIslands.length > 0) {
        lines.push('import { observeLazyIslands } from "@pigeonhole/render/client";')
        lines.push("observeLazyIslands({")
        for (const island of lazyIslands) {
            lines.push(
                `  "${island.customElementTagName}": () => import("${island.moduleSpecifier}"),`,
            )
        }
        lines.push("});")
        lines.push("")
    }

    // island マップの export（eager + lazy 両方）
    lines.push("export const islands = {")
    for (const island of islands) {
        lines.push(`  "${island.tagName}": "${island.customElementTagName}",`)
    }
    lines.push("};")
    lines.push("")

    return lines.join("\n")
}
