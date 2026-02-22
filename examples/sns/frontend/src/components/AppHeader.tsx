import { LitElement, html } from "lit"
import { customElement, state } from "lit/decorators.js"
import { picoStyles } from "../styles/shared-styles.js"
import { appHeaderStyles } from "../styles/sns-styles.js"
import "playful-avatars"

@customElement("sns-app-header")
export class AppHeader extends LitElement {
    static hydrate = "eager"
    static styles = [picoStyles, appHeaderStyles]

    @state() private _username = ""

    firstUpdated() {
        this._username = localStorage.getItem("username") ?? ""
    }

    render() {
        return html`
            <header class="app-header">
                <a href="/" class="app-title">SNS</a>
                ${
                    this._username
                        ? html`
                          <div class="user-info">
                              <playful-avatar name=${this._username} variant="beam"></playful-avatar>
                              <span class="current-user">${this._username}</span>
                          </div>
                          <button class="logout-button" @click=${this._handleLogout}>Logout</button>
                      `
                        : html`
                              <a href="/login">Login</a>
                          `
                }
            </header>
        `
    }

    private async _handleLogout() {
        const token = localStorage.getItem("token")
        if (token) {
            await fetch("/api/sessions/current", {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
        }
        localStorage.removeItem("token")
        localStorage.removeItem("username")
        window.location.href = "/login"
    }
}
