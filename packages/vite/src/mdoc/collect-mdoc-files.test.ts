import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { assert, test } from "vitest"
import { collectMdocFiles } from "./collect-mdoc-files"

function createTempDir(): string {
    const dir = join(
        tmpdir(),
        `pigeonhole-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    mkdirSync(dir, { recursive: true })
    return dir
}

test("*.mdoc ファイルを走査して MdocFileInfo を返す", async () => {
    const root = createTempDir()
    try {
        const pagesDir = join(root, "src/pages")
        mkdirSync(pagesDir, { recursive: true })

        writeFileSync(
            join(pagesDir, "index.mdoc"),
            `---
- import:
    - "components/Card.tsx"
---

# Hello

{% Card title="hello" %}
content
{% /Card %}
`,
        )

        const results = await collectMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
        assert.equal(results[0].imports.length, 1)
        assert.equal(results[0].imports[0].path, "components/Card.tsx")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("frontmatter の input を抽出する", async () => {
    const root = createTempDir()
    try {
        const pagesDir = join(root, "src/pages")
        mkdirSync(pagesDir, { recursive: true })

        writeFileSync(
            join(pagesDir, "Profile.mdoc"),
            `---
- input:
    - userName
    - avatarUrl
---

# {{ userName }}
`,
        )

        const results = await collectMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
        assert.equal(results[0].inputs.length, 2)
        assert.equal(results[0].inputs[0].variableName, "userName")
        assert.equal(results[0].inputs[1].variableName, "avatarUrl")
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("タグの使用属性を AST から収集する", async () => {
    const root = createTempDir()
    try {
        const pagesDir = join(root, "src/pages")
        mkdirSync(pagesDir, { recursive: true })

        writeFileSync(
            join(pagesDir, "index.mdoc"),
            `---
- import:
    - "components/Card.tsx"
---

{% Card title="hello" count=3 %}
content
{% /Card %}
`,
        )

        const results = await collectMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
        assert.isDefined(results[0].tagUsages["Card"])
        assert.include(results[0].tagUsages["Card"].attributes, "title")
        assert.include(results[0].tagUsages["Card"].attributes, "count")
        assert.equal(results[0].tagUsages["Card"].hasChildren, true)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("self-closing タグは hasChildren=false で収集する", async () => {
    const root = createTempDir()
    try {
        const pagesDir = join(root, "src/pages")
        mkdirSync(pagesDir, { recursive: true })

        writeFileSync(
            join(pagesDir, "index.mdoc"),
            `---
- import:
    - "components/Card.tsx"
---

{% Card title="hello" /%}
`,
        )

        const results = await collectMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
        assert.equal(results[0].tagUsages["Card"].hasChildren, false)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("ディレクトリが存在しない場合は空配列を返す", async () => {
    const root = createTempDir()
    try {
        const results = await collectMdocFiles(root, "src/pages")
        assert.deepEqual(results, [])
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

test("サブディレクトリを再帰的に走査する", async () => {
    const root = createTempDir()
    try {
        const subDir = join(root, "src/pages/blog")
        mkdirSync(subDir, { recursive: true })

        writeFileSync(join(subDir, "post.mdoc"), "# Blog Post\n")

        const results = await collectMdocFiles(root, "src/pages")
        assert.equal(results.length, 1)
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})
