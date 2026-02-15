import { describe, expect, test } from "vitest"
import { parse } from "@markdoc/markdoc"
import { rejectFunctions } from "./function"

describe("rejectFunctions", () => {
    test("関数構文なしのmdocはエラーをスローしない", () => {
        const ast = parse("# Hello\n\nThis is a paragraph.")
        expect(() => rejectFunctions(ast, [])).not.toThrow()
    })

    test("ビルトイン関数はエラーをスローしない", () => {
        const ast = parse('{% if equals($name, "alice") %}hello{% /if %}')
        expect(() =>
            rejectFunctions(ast, ["and", "or", "not", "equals", "default", "debug"]),
        ).not.toThrow()
    })

    test("カスタム関数が含まれていたらエラーをスローする", () => {
        const ast = parse("{% if myFunc($name) %}hello{% /if %}")
        expect(() =>
            rejectFunctions(ast, ["and", "or", "not", "equals", "default", "debug"]),
        ).toThrow("Markdoc functions are not allowed: myFunc")
    })

    test("allowlist: [] で全関数を拒否できる", () => {
        const ast = parse('{% if equals($name, "alice") %}hello{% /if %}')
        expect(() => rejectFunctions(ast, [])).toThrow("Markdoc functions are not allowed: equals")
    })
})
