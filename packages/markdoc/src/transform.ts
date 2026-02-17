import Markdoc, { type Config, type RenderableTreeNode } from "@markdoc/markdoc"
import { buildConfig } from "./config"

export type Components = {
    tags?: Config["tags"]
    nodes?: Config["nodes"]
    functions?: Config["functions"]
    partials?: Config["partials"]
}

export type Restrictions = {
    allowedFunctions?: string[]
    allowedFrontmatter?: string[]
}

/**
 * Markdocソースをパース・変換してRenderableTreeNodeを返すメイン関数。
 * 関数の許可チェック、frontmatterの解析を一括で行う。
 * @param source - Markdocソース文字列
 * @param components - tags, nodes, functions, partialsなどのMarkdocコンポーネント設定
 * @param restrictions - 関数・frontmatterの制限設定
 * @param variables - テンプレートに渡す変数
 * @returns 変換されたRenderableTreeNode
 */
export function transformMarkdoc(
    source: string,
    components: Components = {},
    restrictions: Restrictions = {},
    variables: Record<string, unknown> = {},
): RenderableTreeNode {
    const ast = Markdoc.parse(source)

    // Markdoc.validate() で未定義関数を検出
    const allowedFns: Config["functions"] = {}
    if (restrictions.allowedFunctions) {
        for (const name of restrictions.allowedFunctions) {
            allowedFns[name] = {}
        }
    }
    const validationConfig: Config = {
        functions: { ...components.functions, ...allowedFns },
        validation: { validateFunctions: true },
    }
    const validationErrors = Markdoc.validate(ast, validationConfig)
    const fnErrors = validationErrors.filter(
        (e) => e.error.id === "function-undefined" && e.error.level === "critical",
    )
    if (fnErrors.length > 0) {
        const names = fnErrors.map((e) => {
            const match = e.error.message.match(/Undefined function: '(.+)'/)
            return match?.[1] ?? "unknown"
        })
        throw new Error(`Markdoc functions are not allowed: ${names.join(", ")}`)
    }

    const baseConfig = buildConfig(ast, restrictions.allowedFrontmatter)
    const config: Config = {
        tags: components.tags,
        nodes: components.nodes,
        functions: components.functions,
        partials: components.partials,
        variables: { ...baseConfig.variables, ...variables },
    }

    return Markdoc.transform(ast, config)
}
