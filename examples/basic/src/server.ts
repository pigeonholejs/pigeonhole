import { Hono } from "hono"
import { createPageRenderer } from "@pigeonhole/hono"
import {
    components,
    propsSchemas,
    hydrateComponents,
    islandTagNames,
} from "virtual:pigeonhole/components"
import indexPage from "./pages/index.mdoc?raw"

const app = new Hono()
const render = createPageRenderer({ components, propsSchemas, hydrateComponents, islandTagNames })

app.get("/", async (c) => {
    return render(c, indexPage, { name: "World" })
})

export default app
