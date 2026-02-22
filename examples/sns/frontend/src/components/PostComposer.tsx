import { LitElement, html } from "lit"
import { customElement, state } from "lit/decorators.js"

@customElement("sns-post-composer")
export class PostComposer extends LitElement {
    static hydrate = "eager"

    @state() private _content = ""
    @state() private _loading = false
    @state() private _loggedIn = false

    firstUpdated() {
        this._loggedIn = !!localStorage.getItem("token")
    }

    render() {
        if (!this._loggedIn) return html``

        return html`
            <form class="post-composer" @submit=${this._handleSubmit}>
                <textarea
                    placeholder="What's on your mind?"
                    .value=${this._content}
                    @input=${(e: Event) => {
                        this._content = (e.target as HTMLTextAreaElement).value
                    }}
                    required
                ></textarea>
                <button type="submit" ?disabled=${this._loading || !this._content.trim()}>
                    ${this._loading ? "Posting..." : "Post"}
                </button>
            </form>
        `
    }

    private async _handleSubmit(e: Event) {
        e.preventDefault()
        this._loading = true

        const token = localStorage.getItem("token")
        try {
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content: this._content }),
            })

            if (res.ok) {
                const post = await res.json()
                this._content = ""
                document.dispatchEvent(new CustomEvent("post-created", { detail: post }))
            }
        } finally {
            this._loading = false
        }
    }
}
