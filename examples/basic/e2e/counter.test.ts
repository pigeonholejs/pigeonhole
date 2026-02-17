import { test, expect } from "@playwright/test"

test("SSR 出力に ph-counter と shadowrootmode が含まれる", async ({ page }) => {
    await page.goto("/")
    const html = await page.content()
    expect(html).toContain("<ph-counter")
    expect(html).toContain('shadowrootmode="open"')
})

test("SSR 出力に defer-hydration が含まれる", async ({ page }) => {
    await page.goto("/")
    const html = await page.content()
    expect(html).toContain("defer-hydration")
})

test("Hydration 完了後に defer-hydration が除去される", async ({ page }) => {
    await page.goto("/")
    // hydration が完了するまで待機
    await page.waitForFunction(() => {
        const el = document.querySelector("ph-counter")
        return el !== null && !el.hasAttribute("defer-hydration")
    })
    const counter = page.locator("ph-counter")
    await expect(counter).not.toHaveAttribute("defer-hydration")
})

test("初期値が SSR props から復元される", async ({ page }) => {
    await page.goto("/")
    // Shadow DOM 内の count 表示を確認
    await page.waitForFunction(() => {
        const el = document.querySelector("ph-counter")
        if (!el?.shadowRoot) return false
        const span = el.shadowRoot.querySelector(".count")
        return span?.textContent === "42"
    })
    const countText = await page.evaluate(() => {
        const el = document.querySelector("ph-counter")
        return el?.shadowRoot?.querySelector(".count")?.textContent
    })
    expect(countText).toBe("42")
})

test("ボタンクリックでカウントが増加する", async ({ page }) => {
    await page.goto("/")
    // hydration 完了を待機
    await page.waitForFunction(() => {
        const el = document.querySelector("ph-counter")
        if (!el?.shadowRoot) return false
        return el.shadowRoot.querySelector("button") !== null
    })

    // Shadow DOM 内のボタンをクリック
    const button = page.locator("ph-counter").locator("button")
    await button.click()

    await page.waitForFunction(() => {
        const el = document.querySelector("ph-counter")
        return el?.shadowRoot?.querySelector(".count")?.textContent === "43"
    })
    const countText = await page.evaluate(() => {
        const el = document.querySelector("ph-counter")
        return el?.shadowRoot?.querySelector(".count")?.textContent
    })
    expect(countText).toBe("43")
})
