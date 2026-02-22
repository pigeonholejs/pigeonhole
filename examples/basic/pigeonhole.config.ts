import { defineConfig } from "@pigeonhole/vite"

export default defineConfig({
    mdocDir: "src/pages",
    componentRegistries: [{ kind: "file", path: "custom-elements.json" }],
})
