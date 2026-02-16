import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { assert, test } from "vitest"
import { scanMdocFiles } from "./scan-mdoc-files"

/**
 * テスト用の一時ディレクトリを作成する
 */
function createTempDir(): string {
    const dir = join(
        tmpdir(),
        `pigeonhole-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    mkdirSync(dir, { recursive: true })
    return dir
}

// 基本的な .mdoc ファイルスキャン
test("*.mdoc ファイルを走査して MdocFileInfo を返す", async () => {
    const root = createTempDir()
    try {
        const pagesDir = join(root, "src/pages")
        mkdirSync(pagesDir, { recursive: true })

        writeFileSync(
            join(pagesDir, "index.mdoc"),
            `---
- import:
    - "components/Card.mdoc.tsx"
---

# Hello

{% Card title="hello" %}
content
{% /Card %}
`,
        )

        const results = await scanMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
        assert.equal(results[0].imports.length, 1)
        assert.equal(results[0].imports[0].path, "components/Card.mdoc.tsx")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// input を含む frontmatter
test("frontmatter の input を抽出する", async () => {
    const root = createTempDir()
    try {
        const componentsDir = join(root, "src/components")
        mkdirSync(componentsDir, { recursive: true })

        writeFileSync(
            join(componentsDir, "Profile.mdoc"),
            `---
- input:
    - userName
    - avatarUrl
---

# {{ userName }}
`,
        )

        const results = await scanMdocFiles(root, "src/components")
        assert.equal(results.length, 1)
        assert.equal(results[0].inputs.length, 2)
        assert.equal(results[0].inputs[0].variableName, "userName")
        assert.equal(results[0].inputs[1].variableName, "avatarUrl")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// タグ属性の収集
test("タグの使用属性を AST から収集する", async () => {
    const root = createTempDir()
    try {
        const pagesDir = join(root, "src/pages")
        mkdirSync(pagesDir, { recursive: true })

        writeFileSync(
            join(pagesDir, "index.mdoc"),
            `---
- import:
    - "components/Card.mdoc.tsx"
---

{% Card title="hello" count=3 %}
content
{% /Card %}
`,
        )

        const results = await scanMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
        assert.isDefined(results[0].tagAttributes["Card"])
        assert.include(results[0].tagAttributes["Card"], "title")
        assert.include(results[0].tagAttributes["Card"], "count")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// ディレクトリが存在しない場合
test("ディレクトリが存在しない場合は空配列を返す", async () => {
    const root = createTempDir()
    try {
        const results = await scanMdocFiles(root, "src/pages")
        assert.deepEqual(results, [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

// サブディレクトリの再帰走査
test("サブディレクトリを再帰的に走査する", async () => {
    const root = createTempDir()
    try {
        const subDir = join(root, "src/pages/blog")
        mkdirSync(subDir, { recursive: true })

        writeFileSync(join(subDir, "post.mdoc"), "# Blog Post\n")

        const results = await scanMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
