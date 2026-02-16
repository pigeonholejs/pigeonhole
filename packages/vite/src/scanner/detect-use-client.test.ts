import { assert, test } from "vitest"
import { detectUseClient } from "./detect-use-client"

// "use client" ディレクティブの検出
test("ダブルクォートの use client を検出する", () => {
    assert.isTrue(detectUseClient('"use client"\n\nexport function Foo() {}'))
})

test("シングルクォートの use client を検出する", () => {
    assert.isTrue(detectUseClient("'use client'\n\nexport function Foo() {}"))
})

test("use client がない場合は false を返す", () => {
    assert.isFalse(detectUseClient("export function Foo() {}"))
})

// コメント行で始まる場合
test("行コメントで始まる場合は false を返す", () => {
    assert.isFalse(detectUseClient('// comment\n"use client"\n\nexport function Foo() {}'))
})

test("ブロックコメントで始まる場合は false を返す", () => {
    assert.isFalse(detectUseClient('/* comment */\n"use client"\n\nexport function Foo() {}'))
})

test("空文字列の場合は false を返す", () => {
    assert.isFalse(detectUseClient(""))
})
