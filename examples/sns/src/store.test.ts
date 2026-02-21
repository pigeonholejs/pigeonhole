import { describe, it, expect, beforeEach } from "vitest"
import {
    hashPassword,
    createUser,
    findUserByUsername,
    findUserById,
    createSession,
    findSession,
    deleteSession,
    createPost,
    getPosts,
    findPostById,
    addLike,
    removeLike,
    getLikeCount,
    isLikedBy,
    resetStore,
} from "./store.js"

beforeEach(() => {
    resetStore()
})

// --- hashPassword ---

describe("hashPassword", () => {
    // 概要: 同じ入力に対して同じハッシュが返ることを検証する
    // シナリオ: 同一パスワードで2回ハッシュを生成する
    // 期待する動作: 2回の結果が一致する
    it("returns the same hash for the same input", async () => {
        const hash1 = await hashPassword("password123")
        const hash2 = await hashPassword("password123")
        expect(hash1).toBe(hash2)
    })

    // 概要: 異なる入力に対して異なるハッシュが返ることを検証する
    // シナリオ: 異なるパスワードでそれぞれハッシュを生成する
    // 期待する動作: 2つのハッシュが異なる
    it("returns different hashes for different inputs", async () => {
        const hash1 = await hashPassword("password123")
        const hash2 = await hashPassword("password456")
        expect(hash1).not.toBe(hash2)
    })

    // 概要: ハッシュが16進数文字列であることを検証する
    // シナリオ: パスワードをハッシュ化する
    // 期待する動作: SHA-256の64文字16進数文字列が返る
    it("returns a hex string", async () => {
        const hash = await hashPassword("test")
        expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })
})

// --- createUser / findUserByUsername / findUserById ---

describe("User CRUD", () => {
    // 概要: ユーザー作成と取得を検証する
    // シナリオ: ユーザーを作成し、ユーザー名とIDで検索する
    // 期待する動作: 作成したユーザーが正しく取得できる
    it("creates a user and finds it by username and id", () => {
        const user = createUser("u1", "alice", "hashed")
        expect(user.id).toBe("u1")
        expect(user.username).toBe("alice")
        expect(user.password).toBe("hashed")
        expect(user.createdAt).toBeInstanceOf(Date)

        expect(findUserByUsername("alice")).toEqual(user)
        expect(findUserById("u1")).toEqual(user)
    })

    // 概要: ユーザー名の重複を検証する
    // シナリオ: 同じユーザー名で2回ユーザーを作成する
    // 期待する動作: 2回目でエラーがスローされる
    it("throws on duplicate username", () => {
        createUser("u1", "alice", "hashed")
        expect(() => createUser("u2", "alice", "hashed2")).toThrow("Username already taken")
    })

    // 概要: 存在しないユーザーの検索を検証する
    // シナリオ: 未登録のユーザー名・IDで検索する
    // 期待する動作: undefined が返る
    it("returns undefined for non-existent user", () => {
        expect(findUserByUsername("nobody")).toBeUndefined()
        expect(findUserById("no-id")).toBeUndefined()
    })
})

// --- createSession / findSession / deleteSession ---

describe("Session CRUD", () => {
    // 概要: セッションの作成と検索を検証する
    // シナリオ: セッションを作成し、トークンで検索する
    // 期待する動作: 作成したセッションが見つかる
    it("creates and finds a session", () => {
        const session = createSession("tok1", "u1")
        expect(session.token).toBe("tok1")
        expect(session.userId).toBe("u1")
        expect(findSession("tok1")).toEqual(session)
    })

    // 概要: セッション削除後に検索できないことを検証する
    // シナリオ: セッションを作成し、削除した後に検索する
    // 期待する動作: 削除後は undefined が返る
    it("deletes a session so it cannot be found", () => {
        createSession("tok1", "u1")
        expect(deleteSession("tok1")).toBe(true)
        expect(findSession("tok1")).toBeUndefined()
    })

    // 概要: 存在しないセッションの削除を検証する
    // シナリオ: 存在しないトークンで削除を試みる
    // 期待する動作: false が返りエラーにならない
    it("returns false when deleting non-existent session", () => {
        expect(deleteSession("no-such-token")).toBe(false)
    })
})

// --- createPost / findPostById / getPosts ---

describe("Post CRUD", () => {
    // 概要: 投稿の作成とseq自動インクリメントを検証する
    // シナリオ: 2つの投稿を連続で作成する
    // 期待する動作: seqが0, 1と順番に増加する
    it("creates posts with auto-incrementing seq", () => {
        const p1 = createPost("p1", "u1", "first")
        const p2 = createPost("p2", "u1", "second")
        expect(p1.seq).toBe(0)
        expect(p2.seq).toBe(1)
        expect(p1.content).toBe("first")
        expect(p2.content).toBe("second")
    })

    // 概要: IDによる投稿検索を検証する
    // シナリオ: 投稿を作成し、IDで検索する。存在しないIDでも検索する
    // 期待する動作: 存在する投稿が返り、存在しないIDはundefinedが返る
    it("finds post by id", () => {
        const post = createPost("p1", "u1", "content")
        expect(findPostById("p1")).toEqual(post)
        expect(findPostById("no-id")).toBeUndefined()
    })

    // 概要: getPostsが新しい順にソートされることを検証する
    // シナリオ: 同じタイムスタンプ内で複数の投稿を作成する
    // 期待する動作: seq降順（後に作成されたものが先）で返る
    it("getPosts returns posts in newest-first order by seq", () => {
        createPost("p1", "u1", "first")
        createPost("p2", "u1", "second")
        createPost("p3", "u1", "third")

        const result = getPosts(10)
        expect(result.posts).toHaveLength(3)
        expect(result.posts[0].content).toBe("third")
        expect(result.posts[1].content).toBe("second")
        expect(result.posts[2].content).toBe("first")
    })

    // 概要: getPostsのページネーション（limit）を検証する
    // シナリオ: 5件の投稿を作成し、limit=2で取得する
    // 期待する動作: 2件が返り、hasMoreがtrueになる
    it("getPosts respects limit and hasMore", () => {
        for (let i = 0; i < 5; i++) {
            createPost(`p${i}`, "u1", `post-${i}`)
        }

        const result = getPosts(2)
        expect(result.posts).toHaveLength(2)
        expect(result.hasMore).toBe(true)
    })

    // 概要: getPostsのカーソルベースページネーションを検証する
    // シナリオ: 5件の投稿を作成し、limit=2で2ページ取得する
    // 期待する動作: 2ページ目は1ページ目と重複しない
    it("getPosts supports cursor-based pagination", () => {
        for (let i = 0; i < 5; i++) {
            createPost(`p${i}`, "u1", `post-${i}`)
        }

        const page1 = getPosts(2)
        const cursor = page1.posts[page1.posts.length - 1].id
        const page2 = getPosts(2, cursor)

        expect(page2.posts).toHaveLength(2)
        const page1Ids = page1.posts.map((p) => p.id)
        const page2Ids = page2.posts.map((p) => p.id)
        expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false)
    })

    // 概要: 最後のページでhasMore=falseになることを検証する
    // シナリオ: 1件の投稿を作成し、limit=10で取得する
    // 期待する動作: hasMoreがfalseになる
    it("getPosts returns hasMore=false on last page", () => {
        createPost("p1", "u1", "only")
        const result = getPosts(10)
        expect(result.posts).toHaveLength(1)
        expect(result.hasMore).toBe(false)
    })

    // 概要: 投稿がない場合のgetPostsを検証する
    // シナリオ: 投稿を一切作成せずにgetPostsを呼ぶ
    // 期待する動作: 空配列とhasMore=falseが返る
    it("getPosts returns empty when no posts", () => {
        const result = getPosts(10)
        expect(result.posts).toEqual([])
        expect(result.hasMore).toBe(false)
    })
})

// --- addLike / removeLike / getLikeCount / isLikedBy ---

describe("Like operations", () => {
    beforeEach(() => {
        createPost("p1", "u1", "test post")
    })

    // 概要: いいねの追加とカウント・存在チェックを検証する
    // シナリオ: 投稿にいいねを追加し、カウントと存在を確認する
    // 期待する動作: カウントが1になり、isLikedByがtrueを返す
    it("adds a like and checks count and existence", () => {
        addLike("p1", "u1")
        expect(getLikeCount("p1")).toBe(1)
        expect(isLikedBy("p1", "u1")).toBe(true)
    })

    // 概要: いいねの冪等性を検証する
    // シナリオ: 同じユーザーが同じ投稿に2回いいねする
    // 期待する動作: カウントは1のまま増えない
    it("addLike is idempotent — duplicate does not increase count", () => {
        addLike("p1", "u1")
        addLike("p1", "u1")
        expect(getLikeCount("p1")).toBe(1)
    })

    // 概要: いいね解除を検証する
    // シナリオ: いいねを追加してから解除する
    // 期待する動作: カウントが0になり、isLikedByがfalseを返す
    it("removes a like", () => {
        addLike("p1", "u1")
        removeLike("p1", "u1")
        expect(getLikeCount("p1")).toBe(0)
        expect(isLikedBy("p1", "u1")).toBe(false)
    })

    // 概要: 存在しないいいねの解除が安全であることを検証する
    // シナリオ: いいねしていない投稿からいいねを解除する
    // 期待する動作: エラーにならず、カウントは0のまま
    it("removeLike is idempotent — removing non-existent like does not error", () => {
        removeLike("p1", "u1")
        expect(getLikeCount("p1")).toBe(0)
    })

    // 概要: 複数ユーザーのいいねが独立していることを検証する
    // シナリオ: 2人のユーザーが同じ投稿にいいねし、1人が解除する
    // 期待する動作: 解除したユーザーのいいねだけが消え、カウントは1になる
    it("multiple users can like independently", () => {
        addLike("p1", "u1")
        addLike("p1", "u2")
        expect(getLikeCount("p1")).toBe(2)
        expect(isLikedBy("p1", "u1")).toBe(true)
        expect(isLikedBy("p1", "u2")).toBe(true)

        removeLike("p1", "u1")
        expect(getLikeCount("p1")).toBe(1)
        expect(isLikedBy("p1", "u1")).toBe(false)
        expect(isLikedBy("p1", "u2")).toBe(true)
    })

    // 概要: いいねされていない投稿のカウントとチェックを検証する
    // シナリオ: いいねのない投稿でgetLikeCountとisLikedByを呼ぶ
    // 期待する動作: カウントは0、isLikedByはfalse
    it("returns 0 count and false for unliked post", () => {
        expect(getLikeCount("p1")).toBe(0)
        expect(isLikedBy("p1", "u1")).toBe(false)
    })
})

// --- resetStore ---

describe("resetStore", () => {
    // 概要: resetStoreで全データがクリアされることを検証する
    // シナリオ: ユーザー・投稿・セッション・いいねを作成してからresetStoreを呼ぶ
    // 期待する動作: 全データが消え、seqも0にリセットされる
    it("clears all data", () => {
        createUser("u1", "alice", "hashed")
        createPost("p1", "u1", "content")
        createSession("tok1", "u1")
        addLike("p1", "u1")

        resetStore()

        expect(findUserById("u1")).toBeUndefined()
        expect(findUserByUsername("alice")).toBeUndefined()
        expect(findPostById("p1")).toBeUndefined()
        expect(findSession("tok1")).toBeUndefined()
        expect(getLikeCount("p1")).toBe(0)

        // seq should be reset to 0
        const newPost = createPost("p2", "u2", "new")
        expect(newPost.seq).toBe(0)
    })
})
