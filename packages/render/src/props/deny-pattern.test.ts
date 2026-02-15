import { assert, test } from "vitest"
import { matchesDenyPattern } from "./deny-pattern"

// 完全一致パターン
test("完全一致パターンに一致する属性名を検出する", () => {
    assert.isTrue(matchesDenyPattern("class", ["class", "style", "id"]))
    assert.isTrue(matchesDenyPattern("style", ["class", "style", "id"]))
    assert.isTrue(matchesDenyPattern("id", ["class", "style", "id"]))
})

test("完全一致パターンに一致しない属性名は拒否されない", () => {
    assert.isFalse(matchesDenyPattern("title", ["class", "style", "id"]))
    assert.isFalse(matchesDenyPattern("href", ["class", "style", "id"]))
})

// ワイルドカードパターン
test("ワイルドカードパターン on-* に一致する属性名を検出する", () => {
    assert.isTrue(matchesDenyPattern("on-click", ["on-*"]))
    assert.isTrue(matchesDenyPattern("on-hover", ["on-*"]))
    assert.isTrue(matchesDenyPattern("on-submit", ["on-*"]))
})

test("ワイルドカードパターンに一致しない属性名は拒否されない", () => {
    assert.isFalse(matchesDenyPattern("onclick", ["on-*"]))
    assert.isFalse(matchesDenyPattern("title", ["on-*"]))
})

test("空の deny リストでは何も拒否されない", () => {
    assert.isFalse(matchesDenyPattern("class", []))
    assert.isFalse(matchesDenyPattern("on-click", []))
})

// 複合パターン
test("複合パターンで完全一致とワイルドカードの両方を処理する", () => {
    const deny = ["class", "style", "id", "on-*"]
    assert.isTrue(matchesDenyPattern("class", deny))
    assert.isTrue(matchesDenyPattern("on-click", deny))
    assert.isFalse(matchesDenyPattern("title", deny))
})
