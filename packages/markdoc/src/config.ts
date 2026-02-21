import { type Config, type Node } from "markdecl"
import { filterFrontmatter } from "./frontmatter"

/**
 * ASTからMarkdoc Configを構築する。frontmatterをパースしvariablesとして設定する。
 * @param ast - MarkdocのパースされたASTノード
 * @param allowedFrontmatter - 許可するfrontmatterキーのリスト
 * @returns frontmatterをvariablesに含むMarkdoc Config
 */
export function buildConfig(ast: Node, allowedFrontmatter?: string[]): Config {
    const frontmatter = filterFrontmatter(ast, allowedFrontmatter)
    return { variables: frontmatter }
}
