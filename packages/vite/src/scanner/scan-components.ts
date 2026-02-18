import { readFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"
import { extractCustomElementTag } from "./extract-custom-element-tag"
import { extractExportNames } from "./extract-export-names"
import { extractHydrateMode } from "./extract-hydrate-mode"
import { extractPropsSchema } from "./extract-props-schema"
import type { ComponentInfo } from "./types"

// export 命名規約を検証する（Foo または FooElement）
function validateExportName(tagName: string, exportName: string): boolean {
    return exportName === tagName || exportName === `${tagName}Element`
}

// 単一コンポーネントファイルをスキャンする
function scanComponentFile(filePath: string, source: string): ComponentInfo {
    const fileName = basename(filePath)
    const tagName = fileName.replace(".mdoc.tsx", "")

    const exportNames = extractExportNames(source)
    const hasValidExport = exportNames.some((name) => validateExportName(tagName, name))
    if (!hasValidExport) {
        throw new Error(
            `export naming convention violation in "${filePath}": expected export of "${tagName}" or "${tagName}Element", found: [${exportNames.join(", ")}]`,
        )
    }

    const customElementTagName = extractCustomElementTag(source)
    const hydrateMode = extractHydrateMode(source)
    const propsSchema = extractPropsSchema(source, `${tagName}Props`)

    return {
        filePath,
        tagName,
        hydrateMode,
        customElementTagName,
        propsSchema,
    }
}

// コンポーネントディレクトリ配下をスキャンする
export async function scanComponents(root: string, dir: string): Promise<ComponentInfo[]> {
    const absoluteDir = join(root, dir)
    const results: ComponentInfo[] = []

    let files: string[]
    try {
        files = await glob(["**/*.mdoc.tsx"], { cwd: absoluteDir, absolute: true })
    } catch {
        // ディレクトリが存在しない場合は空を返す
        return results
    }

    for (const filePath of files) {
        const source = await readFile(filePath, "utf-8")
        const normalized = normalizePath(filePath)
        results.push(scanComponentFile(normalized, source))
    }

    return results
}
