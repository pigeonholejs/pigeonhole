import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es"],
        },
        outDir: "dist",
        rollupOptions: {
            external: ["js-yaml", "markdecl"],
            output: {
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "[name].js",
            },
        },
    },
    plugins: [
        dts({
            entryRoot: "src",
            exclude: ["src/**/*.test.ts"],
        }),
    ],
})
