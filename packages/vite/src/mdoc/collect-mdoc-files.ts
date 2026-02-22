import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"
import { parse, filterFrontmatter } from "@pigeonhole/markdoc"
import type { MdocFileInfo } from "./types"

// AST からタグの使用属性名を収集する
function extractTagAttributeNames(ast: {
    type: string
    tag?: string
    attributes?: Record<string, unknown>
    children?: unknown[]
}): Record<string, string[]> {
    const tagAttributes: Record<string, string[]> = {}

    function walk(node: {
        type: string
        tag?: string
        attributes?: Record<string, unknown>
        children?: unknown[]
    }): void {
        if (node.type === "tag" && node.tag) {
            const attributeNames = Object.keys(node.attributes ?? {})
            if (attributeNames.length > 0) {
                const existing = tagAttributes[node.tag] ?? []
                for (const name of attributeNames) {
                    if (!existing.includes(name)) {
                        existing.push(name)
                    }
                }
                tagAttributes[node.tag] = existing
            }
        }

        if (node.children) {
            for (const child of node.children as {
                type: string
                tag?: string
                attributes?: Record<string, unknown>
                children?: unknown[]
            }[]) {
                walk(child)
            }
        }
    }

    walk(ast)
    return tagAttributes
}

// 指定ディレクトリ配下の .mdoc ファイルを収集する
export async function collectMdocFiles(root: string, dir: string): Promise<MdocFileInfo[]> {
    const absoluteDir = join(root, dir)
    const results: MdocFileInfo[] = []

    let files: string[]
    try {
        files = await glob(["**/*.mdoc"], { cwd: absoluteDir, absolute: true })
    } catch {
        return results
    }

    for (const filePath of files) {
        const source = await readFile(filePath, "utf-8")
        const ast = parse(source)
        const frontmatter = filterFrontmatter(ast)
        const tagAttributes = extractTagAttributeNames(ast)

        results.push({
            filePath: normalizePath(filePath),
            imports: frontmatter.imports ?? [],
            inputs: frontmatter.inputs ?? [],
            tagAttributes,
        })
    }

    return results
}

