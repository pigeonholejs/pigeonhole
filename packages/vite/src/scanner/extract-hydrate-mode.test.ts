import { assert, test } from "vitest"
import { extractHydrateMode } from "./extract-hydrate-mode"

test("static hydrate = 'eager' を持つクラスは 'eager' を返す", () => {
    const source = `
@customElement("ph-counter")
export class Counter extends LitElement {
    static hydrate = "eager"
}
`
    assert.equal(extractHydrateMode(source), "eager")
})

test("static hydrate がないクラスは 'none' を返す", () => {
    const source = `
@customElement("ph-card")
export class Card extends LitElement {}
`
    assert.equal(extractHydrateMode(source), "none")
})

test("static hydrate = 'none' は 'none' を返す", () => {
    const source = `
@customElement("ph-card")
export class Card extends LitElement {
    static hydrate = "none"
}
`
    assert.equal(extractHydrateMode(source), "none")
})

test("関数コンポーネントは 'none' を返す", () => {
    const source = `
export function Card(props: CardProps, children: string): string {
    return "<div>" + children + "</div>";
}
`
    assert.equal(extractHydrateMode(source), "none")
})
