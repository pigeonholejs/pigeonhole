export type HydrateMode = "none" | "eager"

export function extractHydrateMode(source: string): HydrateMode {
    if (/static\s+hydrate\s*=\s*["']eager["']/.test(source)) {
        return "eager"
    }
    return "none"
}
