// @vitest-environment jsdom
import { test, assert, vi, beforeEach, afterEach } from "vitest"
import { observeLazyIslands } from "./lazy-hydrate"

/**
 * IntersectionObserver モック
 */
type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void

let mockCallback: IntersectionCallback
let observedElements: Element[]
let mockObserveCalls: Element[][]
let mockUnobserveCalls: Element[][]

class MockIntersectionObserver {
    constructor(callback: IntersectionCallback) {
        mockCallback = callback
    }
    observe(el: Element): void {
        observedElements.push(el)
        mockObserveCalls.push([el])
    }
    unobserve(el: Element): void {
        mockUnobserveCalls.push([el])
    }
    disconnect(): void {}
}

beforeEach(() => {
    observedElements = []
    mockObserveCalls = []
    mockUnobserveCalls = []
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
})

afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ""
})

function setupDom(html: string): void {
    document.body.innerHTML = html
}

function triggerIntersection(element: Element): void {
    mockCallback([
        {
            isIntersecting: true,
            target: element,
        } as unknown as IntersectionObserverEntry,
    ])
}

test("observeLazyIslands: data-ph-hydrate='lazy' 要素を IntersectionObserver に登録する", () => {
    setupDom(`
        <my-slider data-ph-island-id="ph-1" data-ph-hydrate="lazy" defer-hydration></my-slider>
        <script type="application/json" id="ph-props-ph-1">{"index":0}</script>
    `)

    observeLazyIslands({
        "my-slider": () => Promise.resolve(),
    })

    assert.equal(mockObserveCalls.length, 1)
})

test("observeLazyIslands: lazy 要素がない場合は IntersectionObserver を作成しない", () => {
    setupDom(`
        <my-counter data-ph-island-id="ph-1"></my-counter>
    `)

    observeLazyIslands({
        "my-counter": () => Promise.resolve(),
    })

    assert.equal(mockObserveCalls.length, 0)
})

test("observeLazyIslands: intersection 時に props が復元される", async () => {
    setupDom(`
        <my-slider data-ph-island-id="ph-1" data-ph-hydrate="lazy" defer-hydration></my-slider>
        <script type="application/json" id="ph-props-ph-1">{"index":3,"label":"test"}</script>
    `)

    observeLazyIslands({
        "my-slider": () => Promise.resolve(),
    })

    const el = document.querySelector("[data-ph-island-id='ph-1']")!
    triggerIntersection(el)

    // await microtask for async hydrateLazyIsland
    await new Promise((r) => setTimeout(r, 0))

    const props = el as unknown as Record<string, unknown>
    assert.equal(props.index, 3)
    assert.equal(props.label, "test")
})

test("observeLazyIslands: intersection 時に defer-hydration が除去される", async () => {
    setupDom(`
        <my-slider data-ph-island-id="ph-1" data-ph-hydrate="lazy" defer-hydration></my-slider>
        <script type="application/json" id="ph-props-ph-1">{}</script>
    `)

    observeLazyIslands({
        "my-slider": () => Promise.resolve(),
    })

    const el = document.querySelector("[data-ph-island-id='ph-1']")!
    assert.isTrue(el.hasAttribute("defer-hydration"))

    triggerIntersection(el)
    await new Promise((r) => setTimeout(r, 0))

    assert.isFalse(el.hasAttribute("defer-hydration"))
})

test("observeLazyIslands: モジュールローダーが呼ばれる", async () => {
    setupDom(`
        <my-slider data-ph-island-id="ph-1" data-ph-hydrate="lazy" defer-hydration></my-slider>
        <script type="application/json" id="ph-props-ph-1">{}</script>
    `)

    const loader = vi.fn(() => Promise.resolve())

    observeLazyIslands({
        "my-slider": loader,
    })

    const el = document.querySelector("[data-ph-island-id='ph-1']")!
    triggerIntersection(el)
    await new Promise((r) => setTimeout(r, 0))

    assert.equal(loader.mock.calls.length, 1)
})

test("observeLazyIslands: unobserve が intersection 後に呼ばれる", () => {
    setupDom(`
        <my-slider data-ph-island-id="ph-1" data-ph-hydrate="lazy" defer-hydration></my-slider>
        <script type="application/json" id="ph-props-ph-1">{}</script>
    `)

    observeLazyIslands({
        "my-slider": () => Promise.resolve(),
    })

    const el = document.querySelector("[data-ph-island-id='ph-1']")!
    triggerIntersection(el)

    assert.equal(mockUnobserveCalls.length, 1)
})

test("observeLazyIslands: エラーが他の island に波及しない", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    setupDom(`
        <my-broken data-ph-island-id="ph-1" data-ph-hydrate="lazy" defer-hydration></my-broken>
        <script type="application/json" id="ph-props-ph-1">{}</script>
        <my-slider data-ph-island-id="ph-2" data-ph-hydrate="lazy" defer-hydration></my-slider>
        <script type="application/json" id="ph-props-ph-2">{"index":1}</script>
    `)

    observeLazyIslands({
        "my-broken": () => Promise.reject(new Error("load failed")),
        "my-slider": () => Promise.resolve(),
    })

    const broken = document.querySelector("[data-ph-island-id='ph-1']")!
    const slider = document.querySelector("[data-ph-island-id='ph-2']")!

    triggerIntersection(broken)
    await new Promise((r) => setTimeout(r, 0))

    triggerIntersection(slider)
    await new Promise((r) => setTimeout(r, 0))

    // slider は正常に復元される
    const props = slider as unknown as Record<string, unknown>
    assert.equal(props.index, 1)

    assert.equal(warnSpy.mock.calls.length, 1)
    assert.include(warnSpy.mock.calls[0]?.[0] as string, "failed to hydrate lazy island")

    warnSpy.mockRestore()
})
