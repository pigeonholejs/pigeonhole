import { LitElement, html } from "lit"
import { customElement, state } from "lit/decorators.js"
import { picoStyles } from "../styles/shared-styles.js"
import { timelineStyles } from "../styles/sns-styles.js"

interface PostData {
    id: string
    content: string
    username: string
    createdAt: string
    likes: number
    likedByMe: boolean
}

@customElement("sns-timeline")
export class Timeline extends LitElement {
    static hydrate = "eager"
    static styles = [picoStyles, timelineStyles]

    @state() private _posts: PostData[] = []
    @state() private _loading = false
    @state() private _hasMore = false
    @state() private _nextCursor: string | null = null

    connectedCallback() {
        super.connectedCallback()
        document.addEventListener("post-created", this._handlePostCreated as EventListener)
    }

    firstUpdated() {
        this._loadPosts()
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        document.removeEventListener("post-created", this._handlePostCreated as EventListener)
    }

    render() {
        return html`
            <div class="timeline">
                ${
                    this._posts.length === 0 && !this._loading
                        ? html`
                              <p class="empty-state">No posts yet.</p>
                          `
                        : this._posts.map(
                              (post) => html`
                              <sns-post-card
                                  post-id=${post.id}
                                  content=${post.content}
                                  username=${post.username}
                                  created-at=${post.createdAt}
                                  likes=${post.likes}
                                  ?liked-by-me=${post.likedByMe}
                              ></sns-post-card>
                          `,
                          )
                }
                ${
                    this._hasMore
                        ? html`
                          <button
                              class="load-more"
                              @click=${this._loadMore}
                              ?disabled=${this._loading}
                          >
                              ${this._loading ? "Loading..." : "Load more"}
                          </button>
                      `
                        : ""
                }
            </div>
        `
    }

    private async _loadPosts() {
        this._loading = true
        const token = localStorage.getItem("token")
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`

        try {
            const res = await fetch("/api/posts", { headers })
            if (res.ok) {
                const data = await res.json()
                this._posts = data.data
                this._hasMore = data.pagination.hasMore
                this._nextCursor = data.pagination.nextCursor
            }
        } finally {
            this._loading = false
        }
    }

    private async _loadMore() {
        if (!this._nextCursor) return
        this._loading = true
        const token = localStorage.getItem("token")
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`

        try {
            const res = await fetch(`/api/posts?cursor=${this._nextCursor}`, { headers })
            if (res.ok) {
                const data = await res.json()
                this._posts = [...this._posts, ...data.data]
                this._hasMore = data.pagination.hasMore
                this._nextCursor = data.pagination.nextCursor
            }
        } finally {
            this._loading = false
        }
    }

    private _handlePostCreated = (e: CustomEvent) => {
        this._posts = [e.detail, ...this._posts]
    }
}
