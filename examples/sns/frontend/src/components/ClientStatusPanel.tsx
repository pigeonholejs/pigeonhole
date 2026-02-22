import { LitElement, html } from "lit"
import { customElement, state } from "lit/decorators.js"

@customElement("sns-client-status-panel")
export class ClientStatusPanel extends LitElement {
    static hydrate = "client-only"

    @state() private _online = true
    @state() private _timezone = "unknown"
    @state() private _userAgent = "unknown"

    connectedCallback() {
        super.connectedCallback()
        window.addEventListener("online", this._syncOnline)
        window.addEventListener("offline", this._syncOnline)
    }

    firstUpdated() {
        this._syncClientInfo()
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        window.removeEventListener("online", this._syncOnline)
        window.removeEventListener("offline", this._syncOnline)
    }

    render() {
        return html`
            <aside class="client-status-panel">
                <h3>Client status</h3>
                <p>Connection: ${this._online ? "Online" : "Offline"}</p>
                <p>Timezone: ${this._timezone}</p>
                <p>User agent: ${this._userAgent}</p>
            </aside>
        `
    }

    private _syncClientInfo() {
        this._syncOnline()
        this._timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"
        this._userAgent = this._formatUserAgent(navigator.userAgent)
    }

    private _syncOnline = () => {
        this._online = navigator.onLine
    }

    private _formatUserAgent(userAgent: string): string {
        const maxLength = 72
        if (userAgent.length <= maxLength) {
            return userAgent
        }
        return `${userAgent.slice(0, maxLength - 3)}...`
    }
}
