import { defineConfig } from "@playwright/test"

export default defineConfig({
    webServer: {
        command: "pnpm dev -- --port 5173 --strictPort",
        port: 5173,
        reuseExistingServer: false,
    },
    testDir: "e2e",
    use: {
        baseURL: "http://localhost:5173",
    },
})
