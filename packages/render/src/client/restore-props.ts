import { PH_ISLAND_ID_ATTR, PH_ISLAND_PROPS_PREFIX, PH_HYDRATE_ATTR } from "../island/constants"

/**
 * アイランドのプロパティを復元する
 *
 * 各アイランドの JSON script を検索し、対応する要素にプロパティを復元する。
 * 障害分離: 1 つの復元失敗で他のアイランドの復元を止めない。
 */
export function restoreIslandProps(): void {
    const scripts = document.querySelectorAll(
        `script[type="application/json"][id^="${PH_ISLAND_PROPS_PREFIX}"]`,
    )

    for (const script of scripts) {
        try {
            restoreSingleIsland(script)
        } catch (error) {
            // 復元失敗時は SSR 静的表示にフォールバック
            console.warn(`[pigeonhole] failed to restore island props for "${script.id}":`, error)
        }
    }
}

/** 1 つのアイランドのプロパティを復元する */
function restoreSingleIsland(scriptElement: Element): void {
    const scriptId = scriptElement.id
    if (!scriptId.startsWith(PH_ISLAND_PROPS_PREFIX)) {
        return
    }

    // script ID から island ID を抽出（ph-props-{id} -> {id}）
    const islandId = scriptId.slice(PH_ISLAND_PROPS_PREFIX.length)

    // 対応する island 要素を検索
    const islandElement = document.querySelector(`[${PH_ISLAND_ID_ATTR}="${islandId}"]`)
    if (!islandElement) {
        return
    }

    // lazy island はスキップ（observeLazyIslands が担当）
    if (islandElement.getAttribute(PH_HYDRATE_ATTR) === "lazy") {
        return
    }

    // JSON を解析してプロパティを復元
    const json = scriptElement.textContent
    if (!json) {
        return
    }

    const props = JSON.parse(json) as Record<string, unknown>
    for (const [key, value] of Object.entries(props)) {
        ;(islandElement as unknown as Record<string, unknown>)[key] = value
    }

    // defer-hydration を除去して Lit hydration をトリガー
    if (islandElement.hasAttribute("defer-hydration")) {
        islandElement.removeAttribute("defer-hydration")
    }
}
