import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"

@customElement("sns-form-layout")
export class FormLayout extends LitElement {
    static hydrate = "none"

    static styles = css`
        :host {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 2rem;
        }

        ::slotted([slot="form"]) {
            width: 100%;
            max-width: 400px;
        }
    `

    render() {
        return html`<slot name="form"></slot>`
    }
}
