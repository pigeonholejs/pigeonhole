import { describe, it, expect } from "vitest"
import { Hono } from "hono"
import { createPageRenderer } from "./renderer"

describe("createPageRenderer", () => {
    it("returns a complete HTML document response", async () => {
        const app = new Hono()
        const render = createPageRenderer()

        app.get("/", async (c) => {
            return render(c, "# Hello")
        })

        const res = await app.request("/")
        expect(res.status).toBe(200)
        expect(res.headers.get("content-type")).toContain("text/html")

        const html = await res.text()
        expect(html).toContain("<!doctype html>")
        expect(html).toContain("<h1>Hello</h1>")
        expect(html).toContain("</html>")
    })

    it("injects variables into the Markdoc template", async () => {
        const app = new Hono()
        const render = createPageRenderer()

        app.get("/", async (c) => {
            return render(c, "Hello {% $name %}", { name: "World" })
        })

        const res = await app.request("/")
        const html = await res.text()
        expect(html).toContain("Hello World")
    })

    it("passes components to renderMdoc without error", async () => {
        const app = new Hono()
        const render = createPageRenderer({
            components: {
                Greeting: (props) => `<p>Hi, ${props.name}!</p>`,
            },
        })

        app.get("/", async (c) => {
            // Markdoc タグとして認識されるには tags 定義が必要
            // ここでは components が渡されてもエラーなく動作することを検証
            return render(c, "# Hello", { name: "Alice" })
        })

        const res = await app.request("/")
        expect(res.status).toBe(200)
        const html = await res.text()
        expect(html).toContain("<!doctype html>")
        expect(html).toContain("<h1>Hello</h1>")
    })

    it("handles empty source", async () => {
        const app = new Hono()
        const render = createPageRenderer()

        app.get("/", async (c) => {
            return render(c, "")
        })

        const res = await app.request("/")
        expect(res.status).toBe(200)
        const html = await res.text()
        expect(html).toContain("<!doctype html>")
    })
})
