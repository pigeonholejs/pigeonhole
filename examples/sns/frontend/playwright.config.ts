import { defineConfig } from "@playwright/test"

export default defineConfig({
    timeout: 60_000,
    webServer: [
        {
            command: "pnpm -C ../backend dev -- --port 5174 --strictPort",
            port: 5174,
            reuseExistingServer: false,
        },
        {
            command: "pnpm dev -- --port 5173 --strictPort",
            port: 5173,
            reuseExistingServer: false,
        },
    ],
    testDir: "e2e",
    use: {
        baseURL: "http://localhost:5173",
    },
})
