import { assert, test } from "vitest"
import { validateCemManifest } from "./validate-cem"

test("有効な CEM は検証を通過する", () => {
    const manifest = {
        schemaVersion: "2.1.0",
        modules: [],
    }

    validateCemManifest(manifest, "valid.json")
})

test("無効な CEM はエラーを投げる", () => {
    try {
        validateCemManifest({ modules: "invalid" }, "invalid.json")
        assert.fail("エラーが投げられるべき")
    } catch (error) {
        assert.include((error as Error).message, "invalid custom-elements manifest")
    }
})

