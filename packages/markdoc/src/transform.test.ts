import { describe, expect, test } from "vitest"
import { parse, Tag } from "markdecl"
import { transformMarkdoc } from "./transform"

function isTag(node: unknown): node is Tag {
    return (
        node != null &&
        typeof node === "object" &&
        "$$mdtype" in node &&
        (node as Tag).$$mdtype === "Tag"
    )
}

function findTag(node: unknown, name: string): Tag | undefined {
    if (!isTag(node)) return undefined
    if (node.name === name) return node
    for (const child of node.children) {
        const found = findTag(child, name)
        if (found) return found
    }
    return undefined
}

describe("transformMarkdoc", () => {
    test("プレーンなMarkdownテキストからRenderableTreeNodeを返す", () => {
        const tree = transformMarkdoc("# Hello\n\nWorld")
        expect(tree).not.toBeNull()
        expect(isTag(tree)).toBe(true)
    })

    test("カスタム関数が含まれていたらエラーをスローする", () => {
        const source = "{% if myCustomFunc() %}yes{% /if %}"
        expect(() => transformMarkdoc(source)).toThrow("Markdoc functions are not allowed")
    })

    test("tagsでカスタムタグを定義すると、RenderableTreeにそのタグがrender名で含まれる", () => {
        const source = '{% callout type="warning" %}Watch out!{% /callout %}'
        const tree = transformMarkdoc(source, {
            tags: {
                callout: {
                    render: "my-callout",
                    children: ["paragraph"],
                    attributes: {
                        type: {
                            type: String,
                            default: "note",
                            matches: ["check", "error", "note", "warning"],
                        },
                    },
                },
            },
        })
        const callout = findTag(tree, "my-callout")
        expect(callout).toBeDefined()
        expect(callout!.attributes.type).toBe("warning")
    })

    test("variablesで変数を渡し、テンプレート内で展開される", () => {
        const source = "{% $userName %}"
        const tree = transformMarkdoc(source, {}, {}, { userName: "Alice" })
        expect(isTag(tree)).toBe(true)
        const tag = tree as Tag
        const text = JSON.stringify(tag)
        expect(text).toContain("Alice")
    })

    test("functionsでカスタム関数を渡すとテンプレート内で使用できる", () => {
        const source = "{% if uppercase('hello') == 'HELLO' %}yes{% /if %}"
        const tree = transformMarkdoc(
            source,
            {
                functions: {
                    uppercase: {
                        transform(parameters: Record<string, unknown>) {
                            const value = parameters[0] as string
                            return value.toUpperCase()
                        },
                    },
                },
            },
            {
                allowedFunctions: ["uppercase"],
            },
        )
        expect(isTag(tree)).toBe(true)
        const text = JSON.stringify(tree)
        expect(text).toContain("yes")
    })

    test("partialsでパーシャルを渡すとテンプレート内で使用できる", () => {
        const partialContent = "**partial content**"
        const partialAst = parse(partialContent)
        const source = '{% partial file="header.md" /%}'
        const tree = transformMarkdoc(source, {
            tags: {
                partial: {
                    render: "partial",
                    attributes: {
                        file: { type: String, required: true },
                    },
                },
            },
            partials: {
                "header.md": partialAst,
            },
        })
        expect(tree).not.toBeNull()
    })

    test("ビルトイン関数はデフォルトでエラーにならない", () => {
        const source = '{% if equals($name, "alice") %}hello{% /if %}'
        expect(() => transformMarkdoc(source, {}, {}, { name: "alice" })).not.toThrow()
    })

    test("allowedFrontmatterでfrontmatterディレクティブを制御できる", () => {
        const source = `---
- import:
    - "./Button.mdoc"
- input:
    - user
---
{% $userName %}`
        const tree = transformMarkdoc(
            source,
            {},
            {
                allowedFrontmatter: ["input"],
            },
            { userName: "Alice" },
        )
        expect(isTag(tree)).toBe(true)
        const text = JSON.stringify(tree)
        expect(text).toContain("Alice")
    })
})
