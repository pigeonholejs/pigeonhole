import { describe, expect, test } from "vitest"
import { Tag } from "@markdoc/markdoc"
import { filterTagAttributes } from "./tag"

describe("filterTagAttributes", () => {
    test("属性なしのTagはそのまま返る", () => {
        const tag = new Tag("div", {}, [])
        const result = filterTagAttributes(tag, ["class", "id"])
        expect(result.name).toBe("div")
        expect(result.attributes).toEqual({})
        expect(result.children).toEqual([])
    })

    test("デフォルトでclassとidが除去される", () => {
        const tag = new Tag("div", { class: "foo", id: "bar", items: [1, 2] }, [])
        const result = filterTagAttributes(tag, ["class", "id"])
        expect(result.attributes).toEqual({ items: [1, 2] })
    })

    test("ユーザー定義属性は保持される", () => {
        const tag = new Tag("list", { class: "x", id: "y", items: ["a"], ordered: true }, [])
        const result = filterTagAttributes(tag, ["class", "id"])
        expect(result.attributes).toEqual({ items: ["a"], ordered: true })
    })

    test("excludesをカスタム指定できる", () => {
        const tag = new Tag("div", { class: "foo", id: "bar", style: "color:red" }, [])
        const result = filterTagAttributes(tag, ["style"])
        expect(result.attributes).toEqual({ class: "foo", id: "bar" })
    })

    test("元のTagは変更されない", () => {
        const tag = new Tag("div", { class: "foo", id: "bar" }, [])
        filterTagAttributes(tag, ["class", "id"])
        expect(tag.attributes).toEqual({ class: "foo", id: "bar" })
    })
})
