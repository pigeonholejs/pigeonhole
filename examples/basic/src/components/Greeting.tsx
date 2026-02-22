import { LitElement, html } from "lit"
import { customElement, property } from "lit/decorators.js"

@customElement("ph-greeting")
export class Greeting extends LitElement {
    @property({ type: String }) name = ""

    createRenderRoot() {
        return this
    }

    render() {
        return html`<p>Hello, ${this.name}!</p>`
    }
}
