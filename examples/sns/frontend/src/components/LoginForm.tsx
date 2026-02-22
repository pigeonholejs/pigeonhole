import { LitElement, html } from "lit"
import { customElement, state } from "lit/decorators.js"

@customElement("sns-login-form")
export class LoginForm extends LitElement {
    static hydrate = "eager"

    @state() private _error = ""
    @state() private _loading = false

    render() {
        return html`
            <form @submit=${this._handleSubmit}>
                <h2>Login</h2>
                ${this._error ? html`<p class="error">${this._error}</p>` : ""}
                <div>
                    <label for="username">Username</label>
                    <input id="username" name="username" type="text" required />
                </div>
                <div>
                    <label for="password">Password</label>
                    <input id="password" name="password" type="password" required />
                </div>
                <button type="submit" ?disabled=${this._loading}>
                    ${this._loading ? "Logging in..." : "Login"}
                </button>
                <p>Don't have an account? <a href="/signup">Sign up</a></p>
            </form>
        `
    }

    private async _handleSubmit(e: Event) {
        e.preventDefault()
        this._error = ""
        this._loading = true

        const form = e.target as HTMLFormElement
        const formData = new FormData(form)
        const username = formData.get("username") as string
        const password = formData.get("password") as string

        try {
            const res = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })

            if (!res.ok) {
                const data = await res.json()
                this._error = data.error?.message ?? "Login failed"
                return
            }

            const data = await res.json()
            localStorage.setItem("token", data.token)
            localStorage.setItem("username", username)
            window.location.href = "/"
        } catch {
            this._error = "Network error"
        } finally {
            this._loading = false
        }
    }
}
