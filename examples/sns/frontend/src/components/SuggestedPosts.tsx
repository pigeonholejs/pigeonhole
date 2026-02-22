import { LitElement, html } from "lit"
import { customElement, state } from "lit/decorators.js"

type ApiPost = {
    id: string
    content: string
    username: string
    likes: number
}

@customElement("sns-suggested-posts")
export class SuggestedPosts extends LitElement {
    static hydrate = "lazy"

    @state() private _loading = false
    @state() private _error = ""
    @state() private _posts: ApiPost[] = []

    firstUpdated() {
        void this._loadSuggestedPosts()
    }

    render() {
        return html`
            <section class="suggested-posts">
                <h3>Suggested posts</h3>
                ${this._loading
                    ? html`<p>Loading suggestions...</p>`
                    : this._error
                      ? html`<p class="error">${this._error}</p>`
                      : this._posts.length === 0
                        ? html`<p>No suggestions yet.</p>`
                        : html`
                              <ul>
                                  ${this._posts.map(
                                      (post) => html`
                                          <li>
                                              <p class="content">${post.content}</p>
                                              <p class="meta">
                                                  by ${post.username} - ${post.likes} likes
                                              </p>
                                          </li>
                                      `,
                                  )}
                              </ul>
                          `}
            </section>
        `
    }

    private async _loadSuggestedPosts() {
        this._loading = true
        this._error = ""

        const token = localStorage.getItem("token")
        const headers: Record<string, string> = {}
        if (token) {
            headers.Authorization = `Bearer ${token}`
        }

        try {
            const res = await fetch("/api/posts?limit=5", { headers })
            if (!res.ok) {
                this._error = "Failed to load suggestions."
                return
            }

            const data = await res.json()
            const posts = (data.data as ApiPost[])
                .filter((post) => post.content.trim().length > 0)
                .sort((a, b) => b.likes - a.likes)
                .slice(0, 3)

            this._posts = posts
        } catch {
            this._error = "Network error while loading suggestions."
        } finally {
            this._loading = false
        }
    }
}
