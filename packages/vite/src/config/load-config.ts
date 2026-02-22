import { existsSync } from "node:fs"
import { join } from "node:path"
import { createJiti } from "jiti"
import { configSchema } from "./schema"
import type { PigeonholeConfig } from "./schema"

const CONFIG_FILE_NAME = "pigeonhole.config.ts"

export async function loadConfig(root: string): Promise<PigeonholeConfig> {
    const configPath = join(root, CONFIG_FILE_NAME)

    if (!existsSync(configPath)) {
        const defaultResult = configSchema.safeParse({})
        if (!defaultResult.success) {
            const messages = defaultResult.error.issues
                .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
                .join("\n")
            throw new Error(`invalid default pigeonhole config:\n${messages}`)
        }
        return defaultResult.data
    }

    const jiti = createJiti(root)
    const raw = await jiti.import(configPath)
    const userConfig = (raw as { default?: unknown }).default ?? raw

    const result = configSchema.safeParse(userConfig)
    if (!result.success) {
        const messages = result.error.issues
            .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
            .join("\n")
        throw new Error(`invalid pigeonhole config in "${configPath}":\n${messages}`)
    }

    return result.data
}
