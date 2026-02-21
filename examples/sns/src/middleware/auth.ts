import { createMiddleware } from "hono/factory"
import { findSession, findUserById } from "../store.js"

type Env = {
    Variables: {
        userId: string
    }
}

export const optionalAuthMiddleware = createMiddleware<Env>(async (c, next) => {
    const header = c.req.header("Authorization")
    if (header?.startsWith("Bearer ")) {
        const token = header.slice(7)
        const session = findSession(token)
        if (session) {
            const user = findUserById(session.userId)
            if (user) {
                c.set("userId", session.userId)
            }
        }
    }
    await next()
})

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
    const header = c.req.header("Authorization")
    if (!header?.startsWith("Bearer ")) {
        return c.json(
            { error: { code: "AUTHORIZATION_REQUIRED", message: "Authorization required" } },
            401,
        )
    }

    const token = header.slice(7)
    const session = findSession(token)
    if (!session) {
        return c.json({ error: { code: "INVALID_TOKEN", message: "Invalid token" } }, 401)
    }

    const user = findUserById(session.userId)
    if (!user) {
        return c.json({ error: { code: "USER_NOT_FOUND", message: "User not found" } }, 401)
    }

    c.set("userId", session.userId)
    await next()
})
