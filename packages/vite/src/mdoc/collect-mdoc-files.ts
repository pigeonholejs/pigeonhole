import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { glob } from "tinyglobby"
import { normalizePath } from "vite"
import { parse, filterFrontmatter } from "@pigeonhole/markdoc"
import type { MdocFileInfo } from "./types"

type AstNode = {
    type: string
    tag?: string
    attributes?: Record<string, unknown>
    children?: unknown[]
}

// AST からタグの使用情報を収集する
function extractTagUsages(ast: AstNode): MdocFileInfo["tagUsages"] {
    const tagUsages: MdocFileInfo["tagUsages"] = {}

    function walk(node: AstNode): void {
        if (node.type === "tag" && node.tag) {
            const usage = tagUsages[node.tag] ?? { attributes: [], hasChildren: false }
            for (const attributeName of Object.keys(node.attributes ?? {})) {
                if (!usage.attributes.includes(attributeName)) {
                    usage.attributes.push(attributeName)
                }
            }
            if ((node.children?.length ?? 0) > 0) {
                usage.hasChildren = true
            }
            tagUsages[node.tag] = usage
        }

        for (const child of (node.children ?? []) as AstNode[]) {
            if (child && typeof child === "object") {
                walk(child)
            }
        }
    }

    walk(ast)
    return tagUsages
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
        const tagUsages = extractTagUsages(ast as AstNode)

        results.push({
            filePath: normalizePath(filePath),
            imports: frontmatter.imports ?? [],
            inputs: frontmatter.inputs ?? [],
            tagUsages,
        })
    }

    return results
}
