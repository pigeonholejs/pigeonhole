import { Hono } from "hono"
import { readFile } from "node:fs/promises"
import { dirname, isAbsolute, resolve } from "node:path"
import { createPageRenderer } from "@pigeonhole/adapters/hono"
import {
    components,
    propsSchemas,
    hydrateComponents,
    islandTagNames,
} from "virtual:pigeonhole/components"
import loginPage from "./layouts/pages/login.mdoc?raw"
import signupPage from "./layouts/pages/signup.mdoc?raw"
import timelinePage from "./layouts/pages/timeline.mdoc?raw"

function stripQueryAndHash(specifier: string): string {
    return specifier.split(/[?#]/)[0]
}

async function resolveMdocImport(specifier: string, importerPath?: string) {
    const cleanSpecifier = stripQueryAndHash(specifier)
    let absolutePath: string

    if (isAbsolute(cleanSpecifier)) {
        absolutePath = cleanSpecifier
    } else if (cleanSpecifier.startsWith("/")) {
        absolutePath = resolve(process.cwd(), cleanSpecifier.slice(1))
    } else if (cleanSpecifier.startsWith(".")) {
        if (!importerPath) {
            return null
        }
        absolutePath = resolve(dirname(importerPath), cleanSpecifier)
    } else {
        absolutePath = resolve(process.cwd(), cleanSpecifier)
    }

    if (!absolutePath.endsWith(".mdoc")) {
        return null
    }

    try {
        const source = await readFile(absolutePath, "utf-8")
        return { id: absolutePath, source }
    } catch {
        return null
    }
}

const app = new Hono()
const render = createPageRenderer({
    components,
    propsSchemas,
    hydrateComponents,
    islandTagNames,
    resolveMdocImport,
    head: [
        '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">',
        '<link rel="stylesheet" href="/sns-layout.css">',
    ].join(""),
})

// Pages
app.get("/", async (c) => {
    return render(
        c,
        {
            source: timelinePage,
            sourcePath: resolve(process.cwd(), "src/layouts/pages/timeline.mdoc"),
        },
        {},
    )
})

app.get("/login", async (c) => {
    return render(
        c,
        {
            source: loginPage,
            sourcePath: resolve(process.cwd(), "src/layouts/pages/login.mdoc"),
        },
        {},
    )
})

app.get("/signup", async (c) => {
    return render(
        c,
        {
            source: signupPage,
            sourcePath: resolve(process.cwd(), "src/layouts/pages/signup.mdoc"),
        },
        {},
    )
})

// API proxy to backend
app.all("/api/*", async (c) => {
    const url = new URL(c.req.url)
    url.port = "5174"
    const res = await fetch(url.toString(), {
        method: c.req.method,
        headers: c.req.raw.headers,
        body:
            c.req.method !== "GET" && c.req.method !== "HEAD" ? await c.req.raw.text() : undefined,
    })

    const status = res.status
    const headers = new Headers(res.headers)
    const noBodyStatus = status === 204 || status === 205 || status === 304

    if (noBodyStatus) {
        headers.delete("content-length")
        headers.delete("content-type")
        return new Response(null, { status, headers })
    }

    return new Response(res.body, { status, headers })
})

export default app
