export interface User {
    id: string
    username: string
    password: string
    createdAt: Date
}

export interface Post {
    id: string
    userId: string
    content: string
    createdAt: Date
    seq: number
}

export interface Like {
    postId: string
    userId: string
}

export interface Session {
    token: string
    userId: string
}

const users = new Map<string, User>()
const posts = new Map<string, Post>()
const likes: Like[] = []
const sessions = new Map<string, Session>()

// Username -> userId index for uniqueness check
const usernameIndex = new Map<string, string>()

let postSeq = 0

export async function hashPassword(password: string): Promise<string> {
    const data = new TextEncoder().encode(password)
    const hash = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

export function createUser(id: string, username: string, hashedPassword: string): User {
    if (usernameIndex.has(username)) {
        throw new Error("Username already taken")
    }
    const user: User = { id, username, password: hashedPassword, createdAt: new Date() }
    users.set(id, user)
    usernameIndex.set(username, id)
    return user
}

export function findUserByUsername(username: string): User | undefined {
    const id = usernameIndex.get(username)
    if (!id) return undefined
    return users.get(id)
}

export function createSession(token: string, userId: string): Session {
    const session: Session = { token, userId }
    sessions.set(token, session)
    return session
}

export function findSession(token: string): Session | undefined {
    return sessions.get(token)
}

export function deleteSession(token: string): boolean {
    return sessions.delete(token)
}

export function findUserById(id: string): User | undefined {
    return users.get(id)
}

export function createPost(id: string, userId: string, content: string): Post {
    const post: Post = { id, userId, content, createdAt: new Date(), seq: postSeq++ }
    posts.set(id, post)
    return post
}

function sortedPosts(): Post[] {
    return Array.from(posts.values()).sort((a, b) => {
        const timeDiff = b.createdAt.getTime() - a.createdAt.getTime()
        if (timeDiff !== 0) return timeDiff
        return b.seq - a.seq
    })
}

export function getPosts(limit: number, cursor?: string): { posts: Post[]; hasMore: boolean } {
    const all = sortedPosts()
    let startIndex = 0
    if (cursor) {
        const cursorIndex = all.findIndex((p) => p.id === cursor)
        if (cursorIndex >= 0) {
            startIndex = cursorIndex + 1
        }
    }
    const slice = all.slice(startIndex, startIndex + limit + 1)
    const hasMore = slice.length > limit
    return { posts: slice.slice(0, limit), hasMore }
}

export function findPostById(id: string): Post | undefined {
    return posts.get(id)
}

export function addLike(postId: string, userId: string): void {
    if (!likes.some((l) => l.postId === postId && l.userId === userId)) {
        likes.push({ postId, userId })
    }
}

export function removeLike(postId: string, userId: string): void {
    const index = likes.findIndex((l) => l.postId === postId && l.userId === userId)
    if (index >= 0) {
        likes.splice(index, 1)
    }
}

export function getLikeCount(postId: string): number {
    return likes.filter((l) => l.postId === postId).length
}

export function isLikedBy(postId: string, userId: string): boolean {
    return likes.some((l) => l.postId === postId && l.userId === userId)
}

export function resetStore(): void {
    users.clear()
    posts.clear()
    likes.length = 0
    sessions.clear()
    usernameIndex.clear()
    postSeq = 0
}
