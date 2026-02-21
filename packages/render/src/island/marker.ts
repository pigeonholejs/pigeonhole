import { PH_ISLAND_ID_ATTR, PH_ISLAND_PROPS_PREFIX, PH_HYDRATE_ATTR } from "./constants"
import type { RenderContext } from "../types"

/** 新しいレンダリングコンテキストを作成する */
export function createRenderContext(): RenderContext {
    return { islandCounter: 0 }
}

/** 一意なアイランド ID を生成する */
export function generateIslandId(ctx: RenderContext): string {
    ctx.islandCounter += 1
    return `ph-${ctx.islandCounter.toString(10)}`
}

/** JSON 内の < を \u003c にエスケープする */
function escapeJsonForScript(json: string): string {
    return json.replaceAll("<", "\\u003c")
}

/**
 * アイランドの props を JSON script タグとしてシリアライズする
 *
 * children を除外し、シリアライズ失敗時はエラーをスローする。
 */
export function serializeIslandProps(islandId: string, props: Record<string, unknown>): string {
    // children を除外
    const filteredProps: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(props)) {
        if (key !== "children") {
            filteredProps[key] = value
        }
    }

    // シリアライズ失敗はサーバーエラーにする
    let json: string
    try {
        json = JSON.stringify(filteredProps)
    } catch (error) {
        throw new Error(
            `failed to serialize island props for island "${islandId}": ${error instanceof Error ? error.message : "unknown error"}`,
        )
    }

    const escaped = escapeJsonForScript(json)
    return `<script type="application/json" id="${PH_ISLAND_PROPS_PREFIX}${islandId}">${escaped}</script>`
}

/**
 * アイランドの HTML に island ID 属性を注入する
 *
 * Lit コンポーネント（render() 出力に外側タグを含む）の場合は
 * 開始タグに data-ph-island-id を注入する。
 * 関数コンポーネント（外側タグを含まない）の場合は従来のラップ方式。
 */
export function wrapIslandHtml(
    islandId: string,
    tagName: string,
    islandHtml: string,
    props: Record<string, unknown>,
    hydrateMode: "eager" | "lazy" | "client-only" = "eager",
): string {
    const propsScript = serializeIslandProps(islandId, props)
    const hydrateAttr = hydrateMode === "eager" ? "" : ` ${PH_HYDRATE_ATTR}="${hydrateMode}"`
    const openTag = `<${tagName}`

    if (islandHtml.includes(openTag)) {
        // Lit コンポーネント: 既存の開始タグに属性を注入
        const html = islandHtml.replace(
            openTag,
            `${openTag} ${PH_ISLAND_ID_ATTR}="${islandId}"${hydrateAttr}`,
        )
        return html + propsScript
    }

    // 関数コンポーネント: 外側タグでラップ
    return `<${tagName} ${PH_ISLAND_ID_ATTR}="${islandId}"${hydrateAttr}>${islandHtml}</${tagName}>${propsScript}`
}
