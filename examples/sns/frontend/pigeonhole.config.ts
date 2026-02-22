import { defineConfig } from "@pigeonhole/vite"

export default defineConfig({
    mdocDir: "src/layouts",
    componentRegistries: [{ kind: "file", path: "custom-elements.json" }],
})
