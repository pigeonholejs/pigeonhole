import { Hono } from "hono"
import { createPageRenderer } from "@pigeonhole/adapters/hono"
import {
    components,
    propsSchemas,
    hydrateComponents,
    islandTagNames,
} from "virtual:pigeonhole/components"
import loginPage from "./pages/login.mdoc?raw"
import signupPage from "./pages/signup.mdoc?raw"
import timelinePage from "./pages/timeline.mdoc?raw"

const app = new Hono()
const render = createPageRenderer({ components, propsSchemas, hydrateComponents, islandTagNames })

// Pages
app.get("/", async (c) => {
    return render(c, timelinePage, {})
})

app.get("/login", async (c) => {
    return render(c, loginPage, {})
})

app.get("/signup", async (c) => {
    return render(c, signupPage, {})
})

// API proxy to backend
app.all("/api/*", async (c) => {
    const url = new URL(c.req.url)
    url.port = "5174"
    const res = await fetch(url.toString(), {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.method !== "GET" && c.req.method !== "HEAD" ? await c.req.raw.text() : undefined,
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
