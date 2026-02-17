"use client"

import { LitElement, html, css } from "lit"
import { customElement, property } from "lit/decorators.js"

@customElement("ph-counter")
export class Counter extends LitElement {
    static styles = css`
        :host {
            display: block;
        }
    `

    @property({ type: Number }) count = 0

    render() {
        return html`
            <span class="count">${this.count}</span>
            <button @click=${this._increment}>+1</button>
        `
    }

    private _increment() {
        this.count++
    }
}
