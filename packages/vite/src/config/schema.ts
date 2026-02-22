import { z } from "zod"

const componentRegistrySchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("file"),
        path: z.string(),
    }),
    z.object({
        kind: z.literal("package"),
        packageName: z.string(),
        cemPath: z.string().default("custom-elements.json"),
    }),
])

export const configSchema = z.object({
    componentsDir: z.string().default("src/components"),
    pagesDir: z.string().default("src/pages"),
    denyPatterns: z.array(z.string()).default([]),
    strictComplexTypes: z.boolean().default(false),
    componentRegistries: z.array(componentRegistrySchema).default([]),
})

export type PigeonholeConfig = z.infer<typeof configSchema>
export type PigeonholeUserConfig = z.input<typeof configSchema>
export type ComponentRegistryConfig = z.infer<typeof componentRegistrySchema>

export function defineConfig(config: PigeonholeUserConfig): PigeonholeUserConfig {
    return config
}
