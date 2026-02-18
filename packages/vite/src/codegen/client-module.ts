import { normalizePath } from "vite"
import type { ComponentInfo } from "../scanner/types"

// クライアント仮想モジュール (virtual:pigeonhole/client) を生成する
export function generateClientModule(islands: ComponentInfo[]): string {
    const lines: string[] = []

    // hydrate support
    lines.push('import "@lit-labs/ssr-client/lit-element-hydrate-support.js";')
    lines.push("")

    // restoreIslandProps
    lines.push('import { restoreIslandProps } from "@pigeonhole/render/client";')
    lines.push("restoreIslandProps();")
    lines.push("")

    // アイランドモジュールの eager import
    for (const island of islands) {
        const path = normalizePath(island.filePath)
        lines.push(`import "${path}";`)
    }
    lines.push("")

    // island マップの export
    lines.push("export const islands = {")
    for (const island of islands) {
        if (island.customElementTagName.length > 0) {
            lines.push(`  "${island.tagName}": "${island.customElementTagName[0]}",`)
        }
    }
    lines.push("};")
    lines.push("")

    return lines.join("\n")
}
