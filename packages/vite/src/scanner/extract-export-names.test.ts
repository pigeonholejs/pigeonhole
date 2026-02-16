import { assert, test } from "vitest"
import { extractExportNames } from "./extract-export-names"

// export function の抽出
test("export function の名前を抽出する", () => {
    const source = `
export function Card(props: CardProps, children: string): string {
    return "<div>" + children + "</div>";
}
`
    assert.deepEqual(extractExportNames(source), ["Card"])
})

// export class の抽出
test("export class の名前を抽出する", () => {
    const source = `
export class CounterElement extends LitElement {
    render() { return html\`<div></div>\`; }
}
`
    assert.deepEqual(extractExportNames(source), ["CounterElement"])
})

// export const の抽出
test("export const の名前を抽出する", () => {
    const source = `
export const Footer = (props: FooterProps, children: string): string => {
    return "<footer>" + children + "</footer>";
};
`
    assert.deepEqual(extractExportNames(source), ["Footer"])
})

// 複数の export
test("複数の export 名を抽出する", () => {
    const source = `
export function Card(props: CardProps, children: string): string {
    return "<div>" + children + "</div>";
}

export const helper = "test";
`
    assert.deepEqual(extractExportNames(source), ["Card", "helper"])
})

// export type / export interface は除外
test("export type は除外する", () => {
    const source = `
export type CardProps = {
    title: string;
}

export function Card(props: CardProps, children: string): string {
    return "<div>" + children + "</div>";
}
`
    assert.deepEqual(extractExportNames(source), ["Card"])
})

test("export interface は除外する", () => {
    const source = `
export interface CardProps {
    title: string;
}

export function Card(props: CardProps, children: string): string {
    return "<div>" + children + "</div>";
}
`
    assert.deepEqual(extractExportNames(source), ["Card"])
})

// export なし
test("export がない場合は空配列を返す", () => {
    const source = `
function internalHelper() {}
`
    assert.deepEqual(extractExportNames(source), [])
})
