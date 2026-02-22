import type { PropsSchema } from "@pigeonhole/contracts"

export type HydrateMode = "none" | "eager" | "lazy" | "client-only"

export interface ComponentInfo {
    tagName: string
    customElementTagName: string
    moduleSpecifier: string
    hydrateMode: HydrateMode
    propsSchema: PropsSchema
}
