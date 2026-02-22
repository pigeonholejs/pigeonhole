import { defineConfig } from "@pigeonhole/vite"

export default defineConfig({
    componentRegistries: [{ kind: "file", path: "custom-elements.json" }],
})
