import { assert, test } from "vitest"
import { extractCustomElementTag } from "./extract-custom-element-tag"

// @customElement デコレータからの抽出
test("ダブルクォートの @customElement からタグ名を抽出する", () => {
    const source = `
@customElement("ph-counter")
class CounterElement extends LitElement {}
`
    assert.equal(extractCustomElementTag(source), "ph-counter")
})

test("シングルクォートの @customElement からタグ名を抽出する", () => {
    const source = `
@customElement('ph-hero-banner')
class HeroBannerElement extends LitElement {}
`
    assert.equal(extractCustomElementTag(source), "ph-hero-banner")
})

test("@customElement が存在しない場合は null を返す", () => {
    const source = `
export function Card(props: CardProps, children: string): string {
    return "<div>" + children + "</div>";
}
`
    assert.isNull(extractCustomElementTag(source))
})

test("空文字列の場合は null を返す", () => {
    assert.isNull(extractCustomElementTag(""))
})
