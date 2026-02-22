import { test, expect } from "@playwright/test"

// Generate unique username per test to avoid conflicts with in-memory store
let counter = 0
function uniqueUser() {
    counter++
    return { username: `user_${Date.now()}_${counter}`, password: "testpass123" }
}

test.describe("Authentication", () => {
    test("signup redirects to timeline", async ({ page }) => {
        const { username, password } = uniqueUser()
        await page.goto("/signup")

        await page.locator("sns-signup-form input[name=username]").fill(username)
        await page.locator("sns-signup-form input[name=password]").fill(password)
        await page.locator("sns-signup-form button[type=submit]").click()

        await page.waitForURL("/")
        expect(page.url()).toContain("/")
    })

    test("signup with duplicate username shows error", async ({ page }) => {
        const { username, password } = uniqueUser()

        // First signup
        await page.goto("/signup")
        await page.locator("sns-signup-form input[name=username]").fill(username)
        await page.locator("sns-signup-form input[name=password]").fill(password)
        await page.locator("sns-signup-form button[type=submit]").click()
        await page.waitForURL("/")

        // Clear auth and try again with same username
        await page.evaluate(() => localStorage.clear())
        await page.goto("/signup")
        await page.locator("sns-signup-form input[name=username]").fill(username)
        await page.locator("sns-signup-form input[name=password]").fill("otherpass")
        await page.locator("sns-signup-form button[type=submit]").click()

        await expect(page.locator("sns-signup-form .error")).toBeVisible()
    })

    test("login redirects to timeline", async ({ page }) => {
        const { username, password } = uniqueUser()

        // Sign up first
        await page.goto("/signup")
        await page.locator("sns-signup-form input[name=username]").fill(username)
        await page.locator("sns-signup-form input[name=password]").fill(password)
        await page.locator("sns-signup-form button[type=submit]").click()
        await page.waitForURL("/")

        // Logout
        await page.evaluate(() => localStorage.clear())

        // Login
        await page.goto("/login")
        await page.locator("sns-login-form input[name=username]").fill(username)
        await page.locator("sns-login-form input[name=password]").fill(password)
        await page.locator("sns-login-form button[type=submit]").click()

        await page.waitForURL("/")
        expect(page.url()).toContain("/")
    })

    test("login with invalid credentials shows error", async ({ page }) => {
        await page.goto("/login")
        await page.locator("sns-login-form input[name=username]").fill("nonexistent")
        await page.locator("sns-login-form input[name=password]").fill("wrongpass")
        await page.locator("sns-login-form button[type=submit]").click()

        await expect(page.locator("sns-login-form .error")).toBeVisible()
    })

    test("logout redirects to login page", async ({ page }) => {
        const { username, password } = uniqueUser()

        // Sign up
        await page.goto("/signup")
        await page.locator("sns-signup-form input[name=username]").fill(username)
        await page.locator("sns-signup-form input[name=password]").fill(password)
        await page.locator("sns-signup-form button[type=submit]").click()
        await page.waitForURL("/")

        // Wait for header to render with logout button
        await page.waitForSelector("sns-app-header .logout-button")
        await page.locator("sns-app-header .logout-button").click()

        await page.waitForURL("/login")
        expect(page.url()).toContain("/login")
    })
})
