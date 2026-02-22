import Ajv from "ajv"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const schemaPath = require.resolve("custom-elements-manifest/schema.json")
const schema = JSON.parse(readFileSync(schemaPath, "utf-8")) as object

const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
})

const validate = ajv.compile(schema)

export function validateCemManifest(manifest: unknown, sourceId: string): void {
    const isValid = validate(manifest)
    if (isValid) {
        return
    }

    const details = (validate.errors ?? [])
        .map((error) => {
            const location = error.instancePath || "/"
            return `  - ${location}: ${error.message ?? "schema validation error"}`
        })
        .join("\n")

    throw new Error(`invalid custom-elements manifest at "${sourceId}":\n${details}`)
}
