import { describe, it, expect, beforeEach } from "vitest"
import app from "./server.js"
import { resetStore } from "./store.js"

beforeEach(() => {
    resetStore()
})

async function signup(username: string, password: string) {
    return app.request("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    })
}

async function login(username: string, password: string): Promise<string> {
    const res = await app.request("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { token: string }
    return json.token
}

async function postAs(token: string, content: string) {
    return app.request("/api/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
    })
}

// --- POST /api/users ---

describe("POST /api/users", () => {
    // 概要: ユーザー新規作成の正常系を検証する
    // シナリオ: ユーザー名とパスワードを送信してユーザーを作成する
    // 期待する動作: 201が返り、レスポンスにid・usernameが含まれ、Locationヘッダが設定される
    it("creates a user (201) with Location header", async () => {
        const res = await signup("alice", "password123")
        expect(res.status).toBe(201)
        const json = (await res.json()) as { id: string; username: string }
        expect(json.username).toBe("alice")
        expect(json.id).toBeDefined()
        expect(res.headers.get("Location")).toMatch(/^\/api\/users\//)
    })

    // 概要: ユーザー名の重複時にコンフリクトエラーが返ることを検証する
    // シナリオ: 同じユーザー名で2回サインアップする
    // 期待する動作: 2回目に409 CONFLICTエラーが返る
    it("rejects duplicate username (409)", async () => {
        await signup("alice", "password123")
        const res = await signup("alice", "other")
        expect(res.status).toBe(409)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("CONFLICT")
        expect(json.error.message).toBeDefined()
    })

    // 概要: パスワード未指定時のバリデーションエラーを検証する
    // シナリオ: パスワードなしでサインアップリクエストを送信する
    // 期待する動作: 400 VALIDATION_ERRORが返る
    it("rejects missing password (400)", async () => {
        const res = await app.request("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "alice" }),
        })
        expect(res.status).toBe(400)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    // 概要: ユーザー名未指定時のバリデーションエラーを検証する
    // シナリオ: ユーザー名なしでサインアップリクエストを送信する
    // 期待する動作: 400 VALIDATION_ERRORが返る
    it("rejects missing username (400)", async () => {
        const res = await app.request("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: "pass123" }),
        })
        expect(res.status).toBe(400)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("VALIDATION_ERROR")
    })
})

// --- POST /api/sessions ---

describe("POST /api/sessions", () => {
    // 概要: 正しい認証情報でトークンが発行されることを検証する
    // シナリオ: ユーザー登録後、正しいユーザー名とパスワードでログインする
    // 期待する動作: 200が返り、トークンが含まれる
    it("returns a token on valid credentials", async () => {
        await signup("alice", "password123")
        const res = await app.request("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "alice", password: "password123" }),
        })
        expect(res.status).toBe(200)
        const json = (await res.json()) as { token: string }
        expect(json.token).toBeDefined()
    })

    // 概要: 存在しないユーザーでのログイン拒否を検証する
    // シナリオ: 未登録のユーザー名でログインを試みる
    // 期待する動作: 401 INVALID_CREDENTIALSが返る
    it("rejects unknown user (401)", async () => {
        const res = await app.request("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "nobody", password: "pass" }),
        })
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("INVALID_CREDENTIALS")
    })

    // 概要: 誤ったパスワードでのログイン拒否を検証する
    // シナリオ: 正しいユーザー名だが間違ったパスワードでログインを試みる
    // 期待する動作: 401 INVALID_CREDENTIALSが返る
    it("rejects wrong password (401)", async () => {
        await signup("alice", "password123")
        const res = await app.request("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "alice", password: "wrong" }),
        })
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("INVALID_CREDENTIALS")
    })

    // 概要: 必須フィールド欠落時のバリデーションエラーを検証する
    // シナリオ: パスワードなしでログインリクエストを送信する
    // 期待する動作: 400 VALIDATION_ERRORが返る
    it("rejects missing fields (400)", async () => {
        const res = await app.request("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "alice" }),
        })
        expect(res.status).toBe(400)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("VALIDATION_ERROR")
    })
})

// --- DELETE /api/sessions/current ---

describe("DELETE /api/sessions/current", () => {
    // 概要: ログアウトでトークンが無効化されることを検証する
    // シナリオ: ログイン後にログアウトし、同じトークンで投稿を試みる
    // 期待する動作: ログアウトは204、その後のリクエストは401になる
    it("invalidates the token (204)", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")

        const logoutRes = await app.request("/api/sessions/current", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        })
        expect(logoutRes.status).toBe(204)

        // Token should no longer work
        const postRes = await postAs(token, "should fail")
        expect(postRes.status).toBe(401)
    })

    // 概要: 未認証でのログアウトリクエスト拒否を検証する
    // シナリオ: Authorizationヘッダなしでログアウトを試みる
    // 期待する動作: 401 AUTHORIZATION_REQUIREDが返る
    it("rejects unauthenticated request (401)", async () => {
        const res = await app.request("/api/sessions/current", {
            method: "DELETE",
        })
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("AUTHORIZATION_REQUIRED")
    })
})

// --- GET /api/posts ---

describe("GET /api/posts", () => {
    // 概要: 投稿がない状態で空データが返ることを検証する
    // シナリオ: 投稿を作成せずに投稿一覧を取得する
    // 期待する動作: 空配列とhasMore=falseが返る
    it("returns empty data when no posts", async () => {
        const res = await app.request("/api/posts")
        expect(res.status).toBe(200)
        const json = (await res.json()) as {
            data: unknown[]
            pagination: { nextCursor: string | null; hasMore: boolean }
        }
        expect(json.data).toEqual([])
        expect(json.pagination.hasMore).toBe(false)
    })

    // 概要: 投稿が新しい順で返ることを検証する
    // シナリオ: 2件の投稿を作成し一覧を取得する
    // 期待する動作: 後に作成した投稿が先に表示される
    it("returns posts in newest-first order", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        await postAs(token, "first")
        await postAs(token, "second")

        const res = await app.request("/api/posts")
        const json = (await res.json()) as { data: { content: string }[] }
        expect(json.data).toHaveLength(2)
        expect(json.data[0].content).toBe("second")
        expect(json.data[1].content).toBe("first")
    })

    // 概要: 投稿レスポンスに必要な全フィールドが含まれることを検証する
    // シナリオ: 投稿を1件作成し一覧を取得する
    // 期待する動作: id, username, content, createdAt, likes, likedByMeが含まれる
    it("returns all expected fields", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        await postAs(token, "hello")

        const res = await app.request("/api/posts")
        const json = (await res.json()) as { data: Record<string, unknown>[] }
        expect(json.data).toHaveLength(1)
        const post = json.data[0]
        expect(post.id).toBeDefined()
        expect(post.username).toBe("alice")
        expect(post.content).toBe("hello")
        expect(post.createdAt).toBeDefined()
        expect(post.likes).toBe(0)
        expect(post.likedByMe).toBe(false)
    })

    // 概要: いいね済みの投稿でlikedByMe=trueが返ることを検証する
    // シナリオ: 投稿を作成し、いいねしてから認証付きで一覧を取得する
    // 期待する動作: likedByMeがtrueになる
    it("returns likedByMe=true for authenticated user who liked", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const postRes = await postAs(token, "likeable")
        const { id: postId } = (await postRes.json()) as { id: string }

        await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        })

        const res = await app.request("/api/posts", {
            headers: { Authorization: `Bearer ${token}` },
        })
        const json = (await res.json()) as { data: { id: string; likedByMe: boolean }[] }
        const post = json.data.find((p) => p.id === postId)
        expect(post?.likedByMe).toBe(true)
    })

    // 概要: 未認証リクエストでlikedByMe=falseが返ることを検証する
    // シナリオ: いいね済みの投稿を未認証で一覧取得する
    // 期待する動作: likedByMeがfalseになる
    it("returns likedByMe=false for unauthenticated request", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const postRes = await postAs(token, "likeable")
        const { id: postId } = (await postRes.json()) as { id: string }

        await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        })

        const res = await app.request("/api/posts")
        const json = (await res.json()) as { data: { id: string; likedByMe: boolean }[] }
        const post = json.data.find((p) => p.id === postId)
        expect(post?.likedByMe).toBe(false)
    })
})

// --- GET /api/posts (pagination) ---

describe("GET /api/posts (pagination)", () => {
    // 概要: limitパラメータが正しく適用されることを検証する
    // シナリオ: 5件の投稿を作成し、limit=2で取得する
    // 期待する動作: 2件が返り、hasMore=true、nextCursorが存在する
    it("respects limit parameter", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        for (let i = 0; i < 5; i++) {
            await postAs(token, `post-${i}`)
        }

        const res = await app.request("/api/posts?limit=2")
        const json = (await res.json()) as {
            data: unknown[]
            pagination: { nextCursor: string | null; hasMore: boolean }
        }
        expect(json.data).toHaveLength(2)
        expect(json.pagination.hasMore).toBe(true)
        expect(json.pagination.nextCursor).toBeDefined()
    })

    // 概要: カーソルで次のページが正しく取得できることを検証する
    // シナリオ: 5件の投稿を作成し、limit=2で2ページ分取得する
    // 期待する動作: 2ページ目は1ページ目と重複しない
    it("returns next page with cursor", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        for (let i = 0; i < 5; i++) {
            await postAs(token, `post-${i}`)
        }

        const firstPage = await app.request("/api/posts?limit=2")
        const firstJson = (await firstPage.json()) as {
            data: { content: string }[]
            pagination: { nextCursor: string }
        }

        const secondPage = await app.request(
            `/api/posts?limit=2&cursor=${firstJson.pagination.nextCursor}`,
        )
        const secondJson = (await secondPage.json()) as {
            data: { content: string }[]
            pagination: { hasMore: boolean }
        }
        expect(secondJson.data).toHaveLength(2)
        // No overlap with first page
        const firstContents = firstJson.data.map((p) => p.content)
        const secondContents = secondJson.data.map((p) => p.content)
        expect(firstContents.some((c) => secondContents.includes(c))).toBe(false)
    })

    // 概要: 最後のページでhasMore=falseが返ることを検証する
    // シナリオ: 1件の投稿を作成し、limit=10で取得する
    // 期待する動作: hasMore=false、nextCursor=null
    it("returns hasMore=false on last page", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        await postAs(token, "only-post")

        const res = await app.request("/api/posts?limit=10")
        const json = (await res.json()) as {
            data: unknown[]
            pagination: { nextCursor: string | null; hasMore: boolean }
        }
        expect(json.data).toHaveLength(1)
        expect(json.pagination.hasMore).toBe(false)
        expect(json.pagination.nextCursor).toBeNull()
    })

    // 概要: limit未指定時にデフォルト値（20）が使われることを検証する
    // シナリオ: 25件の投稿を作成し、limitなしで取得する
    // 期待する動作: 20件が返り、hasMore=true
    it("uses default limit when not specified", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        for (let i = 0; i < 25; i++) {
            await postAs(token, `post-${i}`)
        }

        const res = await app.request("/api/posts")
        const json = (await res.json()) as { data: unknown[]; pagination: { hasMore: boolean } }
        expect(json.data).toHaveLength(20)
        expect(json.pagination.hasMore).toBe(true)
    })

    // 概要: 投稿が0件の場合のページネーションを検証する
    // シナリオ: 投稿なしでlimit=5の一覧取得を行う
    // 期待する動作: 空配列、hasMore=false、nextCursor=null
    it("returns empty data when no posts", async () => {
        const res = await app.request("/api/posts?limit=5")
        const json = (await res.json()) as {
            data: unknown[]
            pagination: { nextCursor: string | null; hasMore: boolean }
        }
        expect(json.data).toEqual([])
        expect(json.pagination.hasMore).toBe(false)
        expect(json.pagination.nextCursor).toBeNull()
    })
})

// --- POST /api/posts ---

describe("POST /api/posts", () => {
    // 概要: 未認証での投稿作成拒否を検証する
    // シナリオ: Authorizationヘッダなしで投稿を作成する
    // 期待する動作: 401 AUTHORIZATION_REQUIREDが返る
    it("rejects unauthenticated request (401)", async () => {
        const res = await app.request("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: "hello" }),
        })
        expect(res.status).toBe(401)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("AUTHORIZATION_REQUIRED")
    })

    // 概要: 認証済みユーザーによる投稿作成の正常系を検証する
    // シナリオ: ログイン後に投稿を作成する
    // 期待する動作: 201が返り、全フィールドが含まれ、Locationヘッダが設定される
    it("creates a post with full response fields (201) and Location header", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const res = await postAs(token, "hello world")
        expect(res.status).toBe(201)
        const json = (await res.json()) as Record<string, unknown>
        expect(json.id).toBeDefined()
        expect(json.content).toBe("hello world")
        expect(json.username).toBe("alice")
        expect(json.createdAt).toBeDefined()
        expect(json.likes).toBe(0)
        expect(json.likedByMe).toBe(false)
        expect(res.headers.get("Location")).toMatch(/^\/api\/posts\//)
    })

    // 概要: content未指定時のバリデーションエラーを検証する
    // シナリオ: 空のボディで投稿作成リクエストを送信する
    // 期待する動作: 400 VALIDATION_ERRORが返る
    it("rejects missing content (400)", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const res = await app.request("/api/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
        })
        expect(res.status).toBe(400)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("VALIDATION_ERROR")
    })
})

// --- PUT /api/posts/:id/like ---

describe("PUT /api/posts/:id/like", () => {
    // 概要: 未認証でのいいねリクエスト拒否を検証する
    // シナリオ: Authorizationヘッダなしでいいねを試みる
    // 期待する動作: 401が返る
    it("rejects unauthenticated request (401)", async () => {
        const res = await app.request("/api/posts/fake-id/like", {
            method: "PUT",
        })
        expect(res.status).toBe(401)
    })

    // 概要: 不正なトークンでのいいねリクエスト拒否を検証する
    // シナリオ: 無効なトークンでいいねを試みる
    // 期待する動作: 401が返る
    it("rejects invalid token (401)", async () => {
        const res = await app.request("/api/posts/fake-id/like", {
            method: "PUT",
            headers: { Authorization: "Bearer invalid-token" },
        })
        expect(res.status).toBe(401)
    })

    // 概要: 存在しない投稿へのいいねで404が返ることを検証する
    // シナリオ: 認証済みユーザーが存在しない投稿IDにいいねする
    // 期待する動作: 404 NOT_FOUNDが返る
    it("returns 404 for non-existent post", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const res = await app.request("/api/posts/non-existent/like", {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        })
        expect(res.status).toBe(404)
        const json = (await res.json()) as { error: { code: string; message: string } }
        expect(json.error.code).toBe("NOT_FOUND")
    })

    // 概要: いいねの正常系を検証する
    // シナリオ: 投稿を作成し、その投稿にいいねする
    // 期待する動作: liked=true、likes=1が返る
    it("likes a post", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const postRes = await postAs(token, "likeable")
        const { id: postId } = (await postRes.json()) as { id: string }

        const likeRes = await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        })
        const likeJson = (await likeRes.json()) as { liked: boolean; likes: number }
        expect(likeJson.liked).toBe(true)
        expect(likeJson.likes).toBe(1)
    })

    // 概要: いいねの冪等性を検証する
    // シナリオ: 同じ投稿に2回いいねする
    // 期待する動作: 2回目もliked=true、likes=1（カウントは増えない）
    it("is idempotent — double PUT results in single like", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const postRes = await postAs(token, "likeable")
        const { id: postId } = (await postRes.json()) as { id: string }

        await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        })
        const secondRes = await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        })
        const json = (await secondRes.json()) as { liked: boolean; likes: number }
        expect(json.liked).toBe(true)
        expect(json.likes).toBe(1)
    })

    // 概要: 複数ユーザーが同じ投稿に独立していいねできることを検証する
    // シナリオ: AliceとBobがそれぞれ同じ投稿にいいねする
    // 期待する動作: いいねカウントが1→2と増加する
    it("multiple users can like the same post independently", async () => {
        await signup("alice", "pass")
        await signup("bob", "pass")
        const aliceToken = await login("alice", "pass")
        const bobToken = await login("bob", "pass")

        const postRes = await postAs(aliceToken, "popular post")
        const { id: postId } = (await postRes.json()) as { id: string }

        const aliceLike = await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${aliceToken}` },
        })
        const aliceJson = (await aliceLike.json()) as { liked: boolean; likes: number }
        expect(aliceJson.liked).toBe(true)
        expect(aliceJson.likes).toBe(1)

        const bobLike = await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${bobToken}` },
        })
        const bobJson = (await bobLike.json()) as { liked: boolean; likes: number }
        expect(bobJson.liked).toBe(true)
        expect(bobJson.likes).toBe(2)
    })
})

// --- DELETE /api/posts/:id/like ---

describe("DELETE /api/posts/:id/like", () => {
    // 概要: いいね解除の正常系を検証する
    // シナリオ: いいねした投稿からいいねを解除する
    // 期待する動作: liked=false、likes=0が返る
    it("unlikes a post", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const postRes = await postAs(token, "likeable")
        const { id: postId } = (await postRes.json()) as { id: string }

        // Like first
        await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        })

        // Unlike
        const unlikeRes = await app.request(`/api/posts/${postId}/like`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        })
        const json = (await unlikeRes.json()) as { liked: boolean; likes: number }
        expect(json.liked).toBe(false)
        expect(json.likes).toBe(0)
    })

    // 概要: いいね解除の冪等性を検証する
    // シナリオ: いいねしていない投稿からいいねを解除する（2回）
    // 期待する動作: エラーにならず、liked=false、likes=0が返る
    it("is idempotent — DELETE when not liked returns same result", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const postRes = await postAs(token, "likeable")
        const { id: postId } = (await postRes.json()) as { id: string }

        // DELETE without prior like
        const res = await app.request(`/api/posts/${postId}/like`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        })
        const json = (await res.json()) as { liked: boolean; likes: number }
        expect(json.liked).toBe(false)
        expect(json.likes).toBe(0)

        // DELETE again — same result
        const res2 = await app.request(`/api/posts/${postId}/like`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        })
        const json2 = (await res2.json()) as { liked: boolean; likes: number }
        expect(json2.liked).toBe(false)
        expect(json2.likes).toBe(0)
    })

    // 概要: 存在しない投稿へのいいね解除で404が返ることを検証する
    // シナリオ: 存在しない投稿IDにDELETEリクエストを送信する
    // 期待する動作: 404が返る
    it("returns 404 for non-existent post", async () => {
        await signup("alice", "pass")
        const token = await login("alice", "pass")
        const res = await app.request("/api/posts/non-existent/like", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        })
        expect(res.status).toBe(404)
    })

    // 概要: いいね解除が自分のいいねだけに影響することを検証する
    // シナリオ: AliceとBobが同じ投稿にいいねし、Aliceだけが解除する
    // 期待する動作: Aliceのいいねのみ消え、likes=1（Bobのいいねが残る）
    it("unlike only removes own like, not others", async () => {
        await signup("alice", "pass")
        await signup("bob", "pass")
        const aliceToken = await login("alice", "pass")
        const bobToken = await login("bob", "pass")

        const postRes = await postAs(aliceToken, "popular post")
        const { id: postId } = (await postRes.json()) as { id: string }

        // Both like
        await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${aliceToken}` },
        })
        await app.request(`/api/posts/${postId}/like`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${bobToken}` },
        })

        // Alice unlikes — Bob's like remains
        const unlikeRes = await app.request(`/api/posts/${postId}/like`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${aliceToken}` },
        })
        const json = (await unlikeRes.json()) as { liked: boolean; likes: number }
        expect(json.liked).toBe(false)
        expect(json.likes).toBe(1)
    })
})
