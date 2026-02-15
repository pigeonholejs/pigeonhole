import yaml from "js-yaml"
import { Node } from "@markdoc/markdoc"

// ---
// - import
//     - "./components/shared/Button.mdoc"
//     - "./components/shared/TextForm.mdoc.tsx"
// ---
export type ImportSyntax = {
    path: string
}

// ---
// - input:
//     - user
//     - posts
//     - year
// ---
export type InputSyntax = {
    variableName: string
}

export type Frontmatter = {
    imports?: ImportSyntax[]
    inputs?: InputSyntax[]
}

const defaultAllowedFrontmatter = ["import", "input"]

/**
 * ASTからfrontmatterをパースし、allowListに基づいてimport/inputディレクティブを抽出する。
 * @param ast - MarkdocのパースされたASTノード
 * @param allowList - 許可するfrontmatterキーのリスト（デフォルト: ["import", "input"]）
 * @returns フィルタリングされたfrontmatterオブジェクト
 */
export function filterFrontmatter(
    ast: Node,
    allowList: string[] = defaultAllowedFrontmatter,
): Frontmatter {
    const frontmatter = ast.attributes.frontmatter
    if (!frontmatter) {
        return {}
    }
    const parsed = yaml.load(frontmatter) as Record<string, string[]>[] | null
    if (!Array.isArray(parsed)) {
        return {}
    }

    const filteredFrontmatter: Frontmatter = {}
    for (const item of parsed) {
        if (allowList.includes("import") && "import" in item) {
            filteredFrontmatter.imports = item["import"].map((path) => ({ path }))
        }
        if (allowList.includes("input") && "input" in item) {
            filteredFrontmatter.inputs = item["input"].map((variableName) => ({ variableName }))
        }
    }
    return filteredFrontmatter
}
