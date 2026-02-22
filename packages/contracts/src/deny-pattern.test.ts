import { assert, test } from "vitest"
import { matchesDenyPattern } from "./deny-pattern"

test("完全一致パターンに一致する属性は true を返す", () => {
    assert.isTrue(matchesDenyPattern("class", ["class", "style", "id"]))
    assert.isTrue(matchesDenyPattern("style", ["class", "style", "id"]))
    assert.isTrue(matchesDenyPattern("id", ["class", "style", "id"]))
})

test("完全一致パターンに一致しない属性は false を返す", () => {
    assert.isFalse(matchesDenyPattern("title", ["class", "style", "id"]))
    assert.isFalse(matchesDenyPattern("href", ["class", "style", "id"]))
})

test("ワイルドカードパターンに一致する属性は true を返す", () => {
    assert.isTrue(matchesDenyPattern("on-click", ["on-*"]))
    assert.isTrue(matchesDenyPattern("on-hover", ["on-*"]))
    assert.isTrue(matchesDenyPattern("on-submit", ["on-*"]))
})

test("ワイルドカードパターンに一致しない属性は false を返す", () => {
    assert.isFalse(matchesDenyPattern("onclick", ["on-*"]))
    assert.isFalse(matchesDenyPattern("title", ["on-*"]))
})

test("denyPatterns が空配列の場合は常に false を返す", () => {
    assert.isFalse(matchesDenyPattern("class", []))
    assert.isFalse(matchesDenyPattern("on-click", []))
})

test("完全一致とワイルドカードが混在していても判定できる", () => {
    const deny = ["class", "on-*"]

    assert.isTrue(matchesDenyPattern("class", deny))
    assert.isTrue(matchesDenyPattern("on-click", deny))
    assert.isFalse(matchesDenyPattern("title", deny))
})
