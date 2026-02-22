import { z } from "zod"

const componentRegistrySchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("file"),
        path: z.string(),
    }),
    z.object({
        kind: z.literal("package"),
        packageName: z.string(),
        cemPath: z.string().optional(),
    }),
])

export const configSchema = z.object({
    mdocDir: z.string().default("src/layouts"),
    denyPatterns: z.array(z.string()).default([]),
    strictComplexTypes: z.boolean().default(false),
    componentRegistries: z.array(componentRegistrySchema).min(1),
})

export type PigeonholeConfig = z.infer<typeof configSchema>
export type PigeonholeUserConfig = z.input<typeof configSchema>
export type ComponentRegistryConfig = z.infer<typeof componentRegistrySchema>

export function defineConfig(config: PigeonholeUserConfig): PigeonholeUserConfig {
    return config
}
