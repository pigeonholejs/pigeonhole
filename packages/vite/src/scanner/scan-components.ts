import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { normalizePath } from "vite"
import { detectUseClient } from "./detect-use-client"
import { extractCustomElementTag } from "./extract-custom-element-tag"
import { extractExportNames } from "./extract-export-names"
import { extractPropsSchema } from "./extract-props-schema"
import type { ComponentInfo } from "./types"

// export 命名規約を検証する（Foo または FooElement）
function validateExportName(tagName: string, exportName: string): boolean {
    return exportName === tagName || exportName === `${tagName}Element`
}

// 単一コンポーネントファイルをスキャンする
function scanComponentFile(filePath: string, source: string): ComponentInfo {
    const fileName = filePath.split("/").at(-1) ?? ""
    const tagName = fileName.replace(".mdoc.tsx", "")

    const exportNames = extractExportNames(source)
    const hasValidExport = exportNames.some((name) => validateExportName(tagName, name))
    if (!hasValidExport) {
        throw new Error(
            `export naming convention violation in "${filePath}": expected export of "${tagName}" or "${tagName}Element", found: [${exportNames.join(", ")}]`,
        )
    }

    const isIsland = detectUseClient(source)
    const customElementTagName = extractCustomElementTag(source)
    const propsSchema = extractPropsSchema(source, `${tagName}Props`)

    return {
        filePath,
        tagName,
        isIsland,
        customElementTagName,
        propsSchema,
    }
}

// ディレクトリを再帰走査して *.mdoc.tsx ファイルを収集する
async function walkDirectory(directory: string): Promise<string[]> {
    const files: string[] = []

    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
        const fullPath = join(directory, entry.name)
        if (entry.isDirectory()) {
            const subFiles = await walkDirectory(fullPath)
            files.push(...subFiles)
        } else if (entry.name.endsWith(".mdoc.tsx")) {
            files.push(fullPath)
        }
    }

    return files
}

// コンポーネントディレクトリ配下をスキャンする
export async function scanComponents(root: string): Promise<ComponentInfo[]> {
    const absoluteDir = join(root, "src/components")
    const results: ComponentInfo[] = []

    let files: string[]
    try {
        files = await walkDirectory(absoluteDir)
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
