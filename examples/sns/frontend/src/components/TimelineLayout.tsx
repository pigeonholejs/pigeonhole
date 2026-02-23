import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"

@customElement("sns-timeline-layout")
export class TimelineLayout extends LitElement {
    static hydrate = "none"

    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 1fr 300px;
            grid-template-rows: auto 1fr;
            gap: 0;
            max-width: 960px;
            margin: 0 auto;
            min-height: 100vh;
            border-left: 1px solid var(--pico-muted-border-color);
            border-right: 1px solid var(--pico-muted-border-color);
        }

        ::slotted([slot="header"]) {
            grid-column: 1 / -1;
        }

        .main {
            display: flex;
            flex-direction: column;
            border-right: 1px solid var(--pico-muted-border-color);
        }

        .sidebar {
            display: flex;
            flex-direction: column;
        }

        @media (max-width: 768px) {
            :host {
                grid-template-columns: 1fr;
            }
            .sidebar {
                display: none;
            }
        }
    `

    render() {
        return html`
            <slot name="header"></slot>
            <div class="main">
                <slot name="composer"></slot>
                <slot name="feed"></slot>
            </div>
            <div class="sidebar">
                <slot name="suggestions"></slot>
                <slot name="status"></slot>
            </div>
        `
    }
}
