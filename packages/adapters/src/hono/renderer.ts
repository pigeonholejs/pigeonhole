import type { Context } from "hono"
import { renderMdoc, createDocument } from "@pigeonhole/render"
import type { ServerComponent, PropsSchema } from "@pigeonhole/render"

type MdocImportResolver = (
    specifier: string,
    importerPath?: string,
) => Promise<{ id: string; source: string } | null>

export interface PageRendererOptions {
    components?: Record<string, ServerComponent>
    propsSchemas?: Record<string, PropsSchema>
    hydrateComponents?: Map<string, "eager" | "lazy" | "client-only">
    islandTagNames?: Record<string, string>
    resolveMdocImport?: MdocImportResolver
    head?: string
}

export type RenderSourceInput = string | { source: string; sourcePath?: string }

export function createPageRenderer(options: PageRendererOptions = {}) {
    return async function render(
        c: Context,
        input: RenderSourceInput,
        variables: Record<string, unknown> = {},
    ): Promise<Response> {
        const source = typeof input === "string" ? input : input.source
        const sourcePath = typeof input === "string" ? undefined : input.sourcePath

        const result = await renderMdoc(source, variables, {
            components: options.components,
            propsSchemas: options.propsSchemas,
            hydrateComponents: options.hydrateComponents,
            islandTagNames: options.islandTagNames,
            mdoc: {
                sourcePath,
                resolveImport: options.resolveMdocImport,
            },
        } as any)
        return c.html(
            createDocument({
                body: result.html,
                hasIslands: result.hasIslands,
                head: options.head,
            }),
        )
    }
}
