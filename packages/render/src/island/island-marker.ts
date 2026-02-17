import { PH_ISLAND_ID_ATTR, PH_ISLAND_PROPS_PREFIX } from "./constants"

/**
 * リクエストスコープのレンダリングコンテキスト
 *
 * 並行リクエストでもアイランド ID が重複しないよう、
 * カウンターをリクエストごとに分離する。
 */
export interface RenderContext {
    islandCounter: number
}

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

/** アイランドの HTML をマーカーでラップする */
export function wrapIslandHtml(
    islandId: string,
    tagName: string,
    innerHtml: string,
    props: Record<string, unknown>,
    options?: { deferHydration?: boolean },
): string {
    const propsScript = serializeIslandProps(islandId, props)
    const deferAttr = options?.deferHydration ? " defer-hydration" : ""
    return `<${tagName} ${PH_ISLAND_ID_ATTR}="${islandId}"${deferAttr}>${innerHtml}</${tagName}>${propsScript}`
}
