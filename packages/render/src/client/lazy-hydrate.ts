import { PH_ISLAND_ID_ATTR, PH_ISLAND_PROPS_PREFIX, PH_HYDRATE_ATTR } from "../island/constants"

export function observeLazyIslands(
    lazyModules: Record<string, () => Promise<unknown>>,
): void {
    const lazyElements = document.querySelectorAll(`[${PH_HYDRATE_ATTR}="lazy"]`)
    if (lazyElements.length === 0) return

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue
            observer.unobserve(entry.target)
            void hydrateLazyIsland(entry.target, lazyModules)
        }
    })

    for (const el of lazyElements) {
        observer.observe(el)
    }
}

async function hydrateLazyIsland(
    element: Element,
    lazyModules: Record<string, () => Promise<unknown>>,
): Promise<void> {
    try {
        const tagName = element.tagName.toLowerCase()
        const loader = lazyModules[tagName]
        if (!loader) return

        // props 復元
        const islandId = element.getAttribute(PH_ISLAND_ID_ATTR)
        if (islandId) {
            const script = document.getElementById(`${PH_ISLAND_PROPS_PREFIX}${islandId}`)
            if (script?.textContent) {
                const props = JSON.parse(script.textContent) as Record<string, unknown>
                for (const [key, value] of Object.entries(props)) {
                    ;(element as unknown as Record<string, unknown>)[key] = value
                }
            }
        }

        // モジュールロード（customElements.define がトリガーされる）
        await loader()

        // defer-hydration 除去で Lit hydration をトリガー
        if (element.hasAttribute("defer-hydration")) {
            element.removeAttribute("defer-hydration")
        }
    } catch (error) {
        console.warn(`[pigeonhole] failed to hydrate lazy island:`, error)
    }
}
