import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assert, test } from "vitest"
import { loadCemRegistry } from "./load-cem"

function createTempDir(): string {
    const dir = join(
        tmpdir(),
        `pigeonhole-cem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    mkdirSync(dir, { recursive: true })
    return dir
}

test("file レジストリから CEM を読み込む", async () => {
    const root = createTempDir()
    try {
        const cemPath = join(root, "custom-elements.json")
        writeFileSync(
            cemPath,
            JSON.stringify({
                schemaVersion: "2.1.0",
                modules: [],
            }),
        )

        const result = await loadCemRegistry(root, {
            kind: "file",
            path: "custom-elements.json",
        })

        assert.equal(result.sourceId, cemPath)
        assert.deepEqual(result.manifest, {
            schemaVersion: "2.1.0",
            modules: [],
        })
    } finally {
        rmSync(root, { recursive: true, force: true })
    }
})

