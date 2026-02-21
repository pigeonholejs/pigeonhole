import { Hono } from "hono"
import {
    hashPassword,
    createUser,
    findUserByUsername,
    createSession,
    deleteSession,
    createPost,
    getPosts,
    findPostById,
    addLike,
    removeLike,
    getLikeCount,
    isLikedBy,
    findUserById,
} from "./store.js"
import { authMiddleware, optionalAuthMiddleware } from "./middleware/auth.js"

const app = new Hono()

const DEFAULT_LIMIT = 20

// --- Users ---

app.post("/api/users", async (c) => {
    const body = await c.req.json<{ username?: string; password?: string }>()
    if (!body.username || !body.password) {
        return c.json(
            { error: { code: "VALIDATION_ERROR", message: "username and password are required" } },
            400,
        )
    }

    if (findUserByUsername(body.username)) {
        return c.json({ error: { code: "CONFLICT", message: "Username already taken" } }, 409)
    }

    const hashedPassword = await hashPassword(body.password)
    const user = createUser(crypto.randomUUID(), body.username, hashedPassword)
    return c.json({ id: user.id, username: user.username }, 201, {
        Location: `/api/users/${user.id}`,
    })
})

// --- Sessions ---

app.post("/api/sessions", async (c) => {
    const body = await c.req.json<{ username?: string; password?: string }>()
    if (!body.username || !body.password) {
        return c.json(
            { error: { code: "VALIDATION_ERROR", message: "username and password are required" } },
            400,
        )
    }

    const user = findUserByUsername(body.username)
    if (!user) {
        return c.json(
            { error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } },
            401,
        )
    }

    const hashedPassword = await hashPassword(body.password)
    if (user.password !== hashedPassword) {
        return c.json(
            { error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } },
            401,
        )
    }

    const token = crypto.randomUUID()
    createSession(token, user.id)
    return c.json({ token })
})

app.delete("/api/sessions/current", authMiddleware, (c) => {
    const token = c.req.header("Authorization")!.slice(7)
    deleteSession(token)
    return c.body(null, 204)
})

// --- Posts ---

app.get("/api/posts", optionalAuthMiddleware, (c) => {
    const userId = c.get("userId") as string | undefined
    const limitParam = c.req.query("limit")
    const cursor = c.req.query("cursor")
    const limit = limitParam
        ? Math.max(1, Math.min(100, Number(limitParam) || DEFAULT_LIMIT))
        : DEFAULT_LIMIT

    const { posts, hasMore } = getPosts(limit, cursor)

    const data = posts.map((post) => {
        const author = findUserById(post.userId)
        return {
            id: post.id,
            content: post.content,
            username: author?.username ?? "unknown",
            createdAt: post.createdAt.toISOString(),
            likes: getLikeCount(post.id),
            likedByMe: userId ? isLikedBy(post.id, userId) : false,
        }
    })

    const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null
    return c.json({ data, pagination: { nextCursor, hasMore } })
})

app.post("/api/posts", authMiddleware, async (c) => {
    const userId = c.get("userId")
    const body = await c.req.json<{ content?: string }>()
    if (!body.content) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "content is required" } }, 400)
    }

    const post = createPost(crypto.randomUUID(), userId, body.content)
    const author = findUserById(userId)
    return c.json(
        {
            id: post.id,
            content: post.content,
            username: author?.username ?? "unknown",
            createdAt: post.createdAt.toISOString(),
            likes: 0,
            likedByMe: false,
        },
        201,
        {
            Location: `/api/posts/${post.id}`,
        },
    )
})

// --- Likes ---

app.put("/api/posts/:id/like", authMiddleware, (c) => {
    const postId = c.req.param("id")
    const userId = c.get("userId")

    if (!findPostById(postId)) {
        return c.json({ error: { code: "NOT_FOUND", message: "Post not found" } }, 404)
    }

    addLike(postId, userId)
    return c.json({ liked: true, likes: getLikeCount(postId) })
})

app.delete("/api/posts/:id/like", authMiddleware, (c) => {
    const postId = c.req.param("id")
    const userId = c.get("userId")

    if (!findPostById(postId)) {
        return c.json({ error: { code: "NOT_FOUND", message: "Post not found" } }, 404)
    }

    removeLike(postId, userId)
    return c.json({ liked: false, likes: getLikeCount(postId) })
})

export default app
