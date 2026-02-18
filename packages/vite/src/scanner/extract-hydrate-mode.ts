export type HydrateMode = "none" | "eager" | "lazy"

export function extractHydrateMode(source: string): HydrateMode {
    if (/static\s+hydrate\s*=\s*["']eager["']/.test(source)) {
        return "eager"
    }
    if (/static\s+hydrate\s*=\s*["']lazy["']/.test(source)) {
        return "lazy"
    }
    return "none"
}
