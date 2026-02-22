import { test, expect } from "@playwright/test"

let counter = 0
function uniqueUser() {
    counter++
    return { username: `layout_${Date.now()}_${counter}`, password: "testpass123" }
}

async function signupAndLogin(page: import("@playwright/test").Page) {
    const { username, password } = uniqueUser()
    await page.goto("/signup")
    await page.locator("sns-signup-form input[name=username]").fill(username)
    await page.locator("sns-signup-form input[name=password]").fill(password)
    await page.locator("sns-signup-form button[type=submit]").click()
    await page.waitForURL("/")
    return username
}

async function getMaxWidthInPxAndExpectedFromRem(
    page: import("@playwright/test").Page,
    selector: string,
    rem: number,
) {
    return page.evaluate(({ selector, rem }) => {
        const el = document.querySelector(selector)
        if (!el) {
            throw new Error(`Element not found: ${selector}`)
        }

        const actualPx = Number.parseFloat(getComputedStyle(el).maxWidth)
        const rootFontSizePx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
        return { actualPx, expectedPx: rem * rootFontSizePx }
    }, { selector, rem })
}

test.describe("Timeline page layout", () => {
    test("timeline page renders layout components", async ({ page }) => {
        await signupAndLogin(page)

        await expect(page.locator("sns-app-header")).toBeVisible()
        await expect(page.locator("sns-post-composer")).toBeVisible()
        await expect(page.locator("sns-timeline")).toBeVisible()
    })

    test("desktop: 2-column grid layout", async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 })
        await signupAndLogin(page)

        const columns = await page.evaluate(() => {
            return getComputedStyle(document.body).gridTemplateColumns
        })
        // 2fr 1fr resolves to two pixel values
        const parts = columns.split(" ").filter((s) => s.length > 0)
        expect(parts.length).toBe(2)
    })

    test("mobile: 1-column grid layout", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await signupAndLogin(page)

        const columns = await page.evaluate(() => {
            return getComputedStyle(document.body).gridTemplateColumns
        })
        const parts = columns.split(" ").filter((s) => s.length > 0)
        expect(parts.length).toBe(1)
    })

    test("all child components are present", async ({ page }) => {
        await signupAndLogin(page)

        await expect(page.locator("sns-app-header")).toBeVisible()
        await expect(page.locator("sns-post-composer")).toBeVisible()
        await expect(page.locator("sns-timeline")).toBeVisible()
        await expect(page.locator("sns-suggested-posts")).toBeVisible()
        await expect(page.locator("sns-client-status-panel")).toBeVisible()
    })
})

test.describe("Form page layout", () => {
    test("login: form component has max-width", async ({ page }) => {
        await page.goto("/login")

        await expect(page.locator("sns-login-form")).toBeVisible()

        const { actualPx, expectedPx } = await getMaxWidthInPxAndExpectedFromRem(
            page,
            "sns-login-form",
            24,
        )
        // 24rem should resolve against the current root font-size.
        expect(actualPx).toBeCloseTo(expectedPx, 1)
    })

    test("signup: form component has max-width", async ({ page }) => {
        await page.goto("/signup")

        await expect(page.locator("sns-signup-form")).toBeVisible()

        const { actualPx, expectedPx } = await getMaxWidthInPxAndExpectedFromRem(
            page,
            "sns-signup-form",
            24,
        )
        expect(actualPx).toBeCloseTo(expectedPx, 1)
    })
})

test.describe("Non-hydrated layout shell", () => {
    test("timeline and form layout custom elements are removed", async ({ page }) => {
        await signupAndLogin(page)
        const timelineLayoutExists = await page.evaluate(
            () => document.querySelector("sns-timeline-page-layout") !== null,
        )
        expect(timelineLayoutExists).toBe(false)

        await page.goto("/login")
        const formLayoutExists = await page.evaluate(
            () => document.querySelector("sns-form-page-layout") !== null,
        )
        expect(formLayoutExists).toBe(false)
    })
})
