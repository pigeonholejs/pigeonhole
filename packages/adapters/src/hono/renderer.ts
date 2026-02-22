import type { Context } from "hono"
import { renderMdoc, createDocument } from "@pigeonhole/render"
import type { ServerComponent, PropsSchema } from "@pigeonhole/render"

export interface PageRendererOptions {
    components?: Record<string, ServerComponent>
    propsSchemas?: Record<string, PropsSchema>
    hydrateComponents?: Map<string, "eager" | "lazy" | "client-only">
    islandTagNames?: Record<string, string>
}

export function createPageRenderer(options: PageRendererOptions = {}) {
    return async function render(
        c: Context,
        source: string,
        variables: Record<string, unknown> = {},
    ): Promise<Response> {
        const result = await renderMdoc(source, variables, {
            components: options.components,
            propsSchemas: options.propsSchemas,
            hydrateComponents: options.hydrateComponents,
            islandTagNames: options.islandTagNames,
        })
        return c.html(
            createDocument({
                body: result.html,
                hasIslands: result.hasIslands,
            }),
        )
    }
}
