import { test, expect } from "@playwright/test"

let counter = 0
function uniqueUser() {
    counter++
    return { username: `liker_${Date.now()}_${counter}`, password: "testpass123" }
}

test.describe("Likes", () => {
    test("like increases count and changes button state", async ({ page }) => {
        const { username, password } = uniqueUser()

        // Signup
        await page.goto("/signup")
        await page.locator("sns-signup-form input[name=username]").fill(username)
        await page.locator("sns-signup-form input[name=password]").fill(password)
        await page.locator("sns-signup-form button[type=submit]").click()
        await page.waitForURL("/")

        // Create a post
        const postContent = `Likeable post ${Date.now()}`
        await page.locator("sns-post-composer textarea").fill(postContent)
        await page.locator("sns-post-composer button[type=submit]").click()
        await expect(page.locator("sns-post-card .post-content").first()).toHaveText(postContent)

        // Verify initial state: Like (0)
        const likeButton = page.locator("sns-post-card .like-button").first()
        await expect(likeButton).toContainText("Like (0)")

        // Click like
        await likeButton.click()
        await expect(likeButton).toContainText("Unlike (1)")
        await expect(likeButton).toHaveClass(/liked/)
    })

    test("unlike decreases count and changes button state", async ({ page }) => {
        const { username, password } = uniqueUser()

        // Signup
        await page.goto("/signup")
        await page.locator("sns-signup-form input[name=username]").fill(username)
        await page.locator("sns-signup-form input[name=password]").fill(password)
        await page.locator("sns-signup-form button[type=submit]").click()
        await page.waitForURL("/")

        // Create a post
        const postContent = `Unlike post ${Date.now()}`
        await page.locator("sns-post-composer textarea").fill(postContent)
        await page.locator("sns-post-composer button[type=submit]").click()
        await expect(page.locator("sns-post-card .post-content").first()).toHaveText(postContent)

        const likeButton = page.locator("sns-post-card .like-button").first()

        // Like first
        await likeButton.click()
        await expect(likeButton).toContainText("Unlike (1)")

        // Unlike
        await likeButton.click()
        await expect(likeButton).toContainText("Like (0)")
        await expect(likeButton).not.toHaveClass(/liked/)
    })
})
