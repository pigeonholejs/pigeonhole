import { LitElement, html } from "lit"
import { customElement, property, state } from "lit/decorators.js"

@customElement("sns-post-card")
export class PostCard extends LitElement {
    static hydrate = "eager"

    @property({ type: String, attribute: "post-id" }) postId = ""
    @property({ type: String }) content = ""
    @property({ type: String }) username = ""
    @property({ type: String, attribute: "created-at" }) createdAt = ""
    @property({ type: Number }) likes = 0
    @property({ type: Boolean, attribute: "liked-by-me" }) likedByMe = false

    @state() private _likeLoading = false

    render() {
        return html`
            <article class="post-card">
                <div class="post-header">
                    <strong class="post-username">${this.username}</strong>
                    <time class="post-time">${this._formatTime(this.createdAt)}</time>
                </div>
                <p class="post-content">${this.content}</p>
                <div class="post-actions">
                    <button
                        class="like-button ${this.likedByMe ? "liked" : ""}"
                        @click=${this._toggleLike}
                        ?disabled=${this._likeLoading}
                    >
                        ${this.likedByMe ? "Unlike" : "Like"} (${this.likes})
                    </button>
                </div>
            </article>
        `
    }

    private _formatTime(iso: string): string {
        if (!iso) return ""
        const date = new Date(iso)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const seconds = Math.floor(diff / 1000)
        if (seconds < 60) return "just now"
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    private async _toggleLike() {
        const token = localStorage.getItem("token")
        if (!token) return

        this._likeLoading = true
        const method = this.likedByMe ? "DELETE" : "PUT"

        try {
            const res = await fetch(`/api/posts/${this.postId}/like`, {
                method,
                headers: { Authorization: `Bearer ${token}` },
            })

            if (res.ok) {
                const data = await res.json()
                this.likes = data.likes
                this.likedByMe = data.liked
            }
        } finally {
            this._likeLoading = false
        }
    }
}
