import { defineConfig } from "vite"
import { pigeonhole } from "@pigeonhole/vite"
import devServer from "@hono/vite-dev-server"

export default defineConfig({
    plugins: [pigeonhole(), devServer({ entry: "src/server.ts" })],
})
