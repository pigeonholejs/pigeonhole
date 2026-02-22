import { LitElement, html } from "lit"
import { customElement, state } from "lit/decorators.js"

@customElement("sns-signup-form")
export class SignupForm extends LitElement {
    static hydrate = "eager"

    @state() private _error = ""
    @state() private _loading = false

    render() {
        return html`
            <form @submit=${this._handleSubmit}>
                <h2>Sign Up</h2>
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
                    ${this._loading ? "Signing up..." : "Sign Up"}
                </button>
                <p>Already have an account? <a href="/login">Login</a></p>
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
            // Sign up
            const signupRes = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })

            if (!signupRes.ok) {
                const data = await signupRes.json()
                this._error = data.error?.message ?? "Signup failed"
                return
            }

            // Auto-login
            const loginRes = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })

            if (!loginRes.ok) {
                this._error = "Signup succeeded but login failed"
                return
            }

            const data = await loginRes.json()
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
