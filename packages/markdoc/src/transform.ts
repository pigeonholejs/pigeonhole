import Markdoc, { type Config, type RenderableTreeNode, type Tag } from "@markdoc/markdoc"
import { buildConfig } from "./config"
import { rejectFunctions } from "./function"
import { filterTagAttributes } from "./tag"

export type Components = {
    tags?: Config["tags"]
    nodes?: Config["nodes"]
    functions?: Config["functions"]
    partials?: Config["partials"]
}

export type Restrictions = {
    allowedFunctions?: string[]
    excludeAttributes?: string[]
    allowedFrontmatter?: string[]
}

function isTag(node: RenderableTreeNode): node is Tag {
    return node != null && typeof node === "object" && "$$mdtype" in node && node.$$mdtype === "Tag"
}

function filterTreeAttributes(node: RenderableTreeNode, excludes: string[]): RenderableTreeNode {
    if (!isTag(node)) return node
    const filtered = filterTagAttributes(node, excludes)
    return new Markdoc.Tag(
        filtered.name,
        filtered.attributes,
        filtered.children.map((child) => filterTreeAttributes(child, excludes)),
    )
}

/**
 * Markdocソースをパース・変換してRenderableTreeNodeを返すメイン関数。
 * 関数の許可チェック、frontmatterの解析、属性フィルタリングを一括で行う。
 * @param source - Markdocソース文字列
 * @param components - tags, nodes, functions, partialsなどのMarkdocコンポーネント設定
 * @param restrictions - 関数・属性・frontmatterの制限設定
 * @param variables - テンプレートに渡す変数
 * @returns 変換されたRenderableTreeNode
 */
export function transformMarkdoc(
    source: string,
    components: Components = {},
    restrictions: Restrictions = {
        allowedFunctions: ["and", "or", "not", "equals", "default", "debug"],
        excludeAttributes: ["class", "id"],
    },
    variables: Record<string, unknown> = {},
): RenderableTreeNode {
    const ast = Markdoc.parse(source)
    rejectFunctions(ast, restrictions.allowedFunctions ?? [])

    const baseConfig = buildConfig(ast, restrictions.allowedFrontmatter)
    const config: Config = {
        tags: components.tags,
        nodes: components.nodes,
        functions: components.functions,
        partials: components.partials,
        variables: { ...baseConfig.variables, ...variables },
    }

    const content = Markdoc.transform(ast, config)
    return filterTreeAttributes(content, restrictions.excludeAttributes ?? [])
}
