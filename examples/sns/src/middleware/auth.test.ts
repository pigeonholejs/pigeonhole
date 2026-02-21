import { describe, it, expect, beforeEach } from "vitest"
import { Hono } from "hono"
import { authMiddleware, optionalAuthMiddleware } from "./auth.js"
import { createUser, createSession, resetStore } from "../store.js"

// テスト用の最小限のHonoアプリを構築する
// authMiddleware と optionalAuthMiddleware をそれぞれ適用したルートを用意する
const testApp = new Hono()
testApp.get("/protected", authMiddleware, (c) => c.json({ userId: c.get("userId") }))
testApp.get("/optional", optionalAuthMiddleware, (c) => c.json({ userId: c.get("userId") ?? null }))

beforeEach(() => {
    resetStore()
})

// --- authMiddleware ---

describe("authMiddleware", () => {
    // 概要: Authorizationヘッダなしで401が返ることを検証する
    // シナリオ: ヘッダなしでprotectedルートにアクセスする
    // 期待する動作: 401 AUTHORIZATION_REQUIRED エラーが返る
    it("returns 401 AUTHORIZATION_REQUIRED when no header", async () => {
        const res = await testApp.request("/protected")
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string } }
        expect(json.error.code).toBe("AUTHORIZATION_REQUIRED")
    })

    // 概要: 不正なトークンで401が返ることを検証する
    // シナリオ: 存在しないトークンでprotectedルートにアクセスする
    // 期待する動作: 401 INVALID_TOKEN エラーが返る
    it("returns 401 INVALID_TOKEN for invalid token", async () => {
        const res = await testApp.request("/protected", {
            headers: { Authorization: "Bearer invalid-token" },
        })
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string } }
        expect(json.error.code).toBe("INVALID_TOKEN")
    })

    // 概要: セッションはあるがユーザーが削除済みの場合を検証する
    // シナリオ: セッションを作成するがユーザーは登録しない状態でアクセスする
    // 期待する動作: 401 USER_NOT_FOUND エラーが返る
    it("returns 401 USER_NOT_FOUND when session exists but user deleted", async () => {
        // Create a session pointing to a non-existent user
        createSession("orphan-token", "deleted-user-id")
        const res = await testApp.request("/protected", {
            headers: { Authorization: "Bearer orphan-token" },
        })
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string } }
        expect(json.error.code).toBe("USER_NOT_FOUND")
    })

    // 概要: 有効なトークンでuserIdがセットされることを検証する
    // シナリオ: ユーザーとセッションを作成し、正しいトークンでアクセスする
    // 期待する動作: 200が返り、レスポンスにuserIdが含まれる
    it("sets userId on valid token", async () => {
        createUser("u1", "alice", "hashed")
        createSession("valid-token", "u1")
        const res = await testApp.request("/protected", {
            headers: { Authorization: "Bearer valid-token" },
        })
        expect(res.status).toBe(200)
        const json = (await res.json()) as { userId: string }
        expect(json.userId).toBe("u1")
    })

    // 概要: Bearer以外のスキームで401が返ることを検証する
    // シナリオ: "Basic xxx" 形式のヘッダでアクセスする
    // 期待する動作: 401 AUTHORIZATION_REQUIRED エラーが返る
    it("returns 401 when Authorization header is not Bearer", async () => {
        const res = await testApp.request("/protected", {
            headers: { Authorization: "Basic abc123" },
        })
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string } }
        expect(json.error.code).toBe("AUTHORIZATION_REQUIRED")
    })
})

// --- optionalAuthMiddleware ---

describe("optionalAuthMiddleware", () => {
    // 概要: ヘッダなしでもnext()が呼ばれuserIdがnullであることを検証する
    // シナリオ: ヘッダなしでoptionalルートにアクセスする
    // 期待する動作: 200が返り、userIdがnull
    it("passes through without header, userId is null", async () => {
        const res = await testApp.request("/optional")
        expect(res.status).toBe(200)
        const json = (await res.json()) as { userId: string | null }
        expect(json.userId).toBeNull()
    })

    // 概要: 有効なトークンでuserIdがセットされることを検証する
    // シナリオ: ユーザーとセッションを作成し、正しいトークンでアクセスする
    // 期待する動作: 200が返り、userIdがセットされる
    it("sets userId on valid token", async () => {
        createUser("u1", "alice", "hashed")
        createSession("valid-token", "u1")
        const res = await testApp.request("/optional", {
            headers: { Authorization: "Bearer valid-token" },
        })
        expect(res.status).toBe(200)
        const json = (await res.json()) as { userId: string }
        expect(json.userId).toBe("u1")
    })

    // 概要: 不正なトークンでもエラーにならずnext()が呼ばれることを検証する
    // シナリオ: 存在しないトークンでoptionalルートにアクセスする
    // 期待する動作: 200が返り、userIdがnull（エラーにならない）
    it("passes through with invalid token, userId is null", async () => {
        const res = await testApp.request("/optional", {
            headers: { Authorization: "Bearer invalid-token" },
        })
        expect(res.status).toBe(200)
        const json = (await res.json()) as { userId: string | null }
        expect(json.userId).toBeNull()
    })

    // 概要: セッションはあるがユーザー削除済みの場合にuserIdがセットされないことを検証する
    // シナリオ: 孤立セッション（ユーザーなし）のトークンでアクセスする
    // 期待する動作: 200が返り、userIdがnull（エラーにならない）
    it("passes through when session exists but user deleted, userId is null", async () => {
        createSession("orphan-token", "deleted-user-id")
        const res = await testApp.request("/optional", {
            headers: { Authorization: "Bearer orphan-token" },
        })
        expect(res.status).toBe(200)
        const json = (await res.json()) as { userId: string | null }
        expect(json.userId).toBeNull()
    })
})
