import { test, expect } from "@playwright/test"

let counter = 0
function uniqueUser() {
    counter++
    return { username: `poster_${Date.now()}_${counter}`, password: "testpass123" }
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

test.describe("Posts", () => {
    test("create post appears at top of timeline", async ({ page }) => {
        await signupAndLogin(page)

        const postContent = `Test post ${Date.now()}`
        await page.locator("sns-post-composer textarea").fill(postContent)
        await page.locator("sns-post-composer button[type=submit]").click()

        // Wait for the post to appear
        await expect(page.locator("sns-post-card .post-content").first()).toHaveText(postContent)
    })

    test("posts display in newest-first order", async ({ page }) => {
        await signupAndLogin(page)

        // Create two posts
        const first = `First post ${Date.now()}`
        await page.locator("sns-post-composer textarea").fill(first)
        await page.locator("sns-post-composer button[type=submit]").click()
        await expect(page.locator("sns-post-card .post-content").first()).toHaveText(first)

        const second = `Second post ${Date.now()}`
        await page.locator("sns-post-composer textarea").fill(second)
        await page.locator("sns-post-composer button[type=submit]").click()
        await expect(page.locator("sns-post-card .post-content").first()).toHaveText(second)

        // Verify order: second post should be first
        const contents = await page.locator("sns-post-card .post-content").allTextContents()
        expect(contents[0]).toBe(second)
        expect(contents[1]).toBe(first)
    })

    test("pagination loads more posts", async ({ page, request }) => {
        const { username, password } = {
            username: `paginator_${Date.now()}`,
            password: "testpass123",
        }

        // Sign up via API
        await request.post("/api/users", {
            data: { username, password },
        })
        const loginRes = await request.post("/api/sessions", {
            data: { username, password },
        })
        const { token } = await loginRes.json()

        // Create 25 posts via API (default page size is 20)
        for (let i = 0; i < 25; i++) {
            await request.post("/api/posts", {
                data: { content: `Pagination post ${i}` },
                headers: { Authorization: `Bearer ${token}` },
            })
        }

        // Load page with auth
        await page.goto("/")
        await page.evaluate(
            ([t, u]) => {
                localStorage.setItem("token", t)
                localStorage.setItem("username", u)
            },
            [token, username],
        )
        await page.reload()

        // Wait for initial posts to load
        await page.waitForSelector("sns-post-card")
        const initialCount = await page.locator("sns-post-card").count()
        expect(initialCount).toBe(20)

        // Click load more
        await page.locator("sns-timeline .load-more").click()
        // After loading more, there should be more posts than the initial page
        const finalLocator = page.locator("sns-post-card")
        await expect(async () => {
            const count = await finalLocator.count()
            expect(count).toBeGreaterThan(initialCount)
        }).toPass()
    })
})
