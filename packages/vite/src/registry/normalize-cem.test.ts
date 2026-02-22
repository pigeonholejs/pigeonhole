import { assert, test } from "vitest"
import { normalizeCemManifest } from "./normalize-cem"

test("CEM を ComponentContract に正規化する", () => {
    const manifest = {
        modules: [
            {
                path: "./counter.js",
                declarations: [
                    {
                        name: "Counter",
                        tagName: "ph-counter",
                        attributes: [
                            { name: "count", type: { text: "number" } },
                            { name: "variant", type: { text: '"sm" | "md" | "lg"' } },
                        ],
                    },
                ],
            },
        ],
    }

    const contracts = normalizeCemManifest(manifest, {
        sourceId: "local",
        manifestPath: "/project/custom-elements.json",
        registryKind: "file",
    })
    const counter = contracts.byComponentName.get("Counter")
    assert.isDefined(counter)
    assert.equal(counter?.customElementTagName, "ph-counter")
    assert.equal(counter?.moduleSpecifier, "/project/counter.js")
    assert.equal(counter?.hydrateMode, "none")
    assert.equal(counter?.attributes.count.type.kind, "primitive")
    assert.equal(counter?.attributes.count.type.rawText, "number")
    assert.equal(counter?.attributes.variant.type.kind, "literal-union")
})

test("reference と complex を区別して保持する", () => {
    const manifest = {
        modules: [
            {
                path: "./profile.js",
                declarations: [
                    {
                        name: "Profile",
                        tagName: "ph-profile",
                        attributes: [
                            {
                                name: "user",
                                type: { text: "User", references: [{ name: "User" }] },
                            },
                            {
                                name: "meta",
                                type: { text: "Record<string, unknown>" },
                            },
                        ],
                    },
                ],
            },
        ],
    }

    const contracts = normalizeCemManifest(manifest, {
        sourceId: "pkg",
        manifestPath: "/project/custom-elements.json",
        registryKind: "package",
        packageName: "@acme/ui",
    })
    const profile = contracts.byComponentName.get("Profile")
    assert.isDefined(profile)
    assert.equal(profile?.moduleSpecifier, "@acme/ui/profile.js")
    assert.equal(profile?.attributes.user.type.kind, "reference")
    assert.equal(profile?.attributes.meta.type.kind, "complex")
})

test("type が無い場合のみ unknown になる", () => {
    const manifest = {
        modules: [
            {
                path: "./no-type.js",
                declarations: [
                    {
                        name: "NoType",
                        tagName: "ph-no-type",
                        attributes: [{ name: "value" }],
                    },
                ],
            },
        ],
    }

    const contracts = normalizeCemManifest(manifest, {
        sourceId: "pkg",
        manifestPath: "/project/custom-elements.json",
        registryKind: "file",
    })
    const component = contracts.byComponentName.get("NoType")
    assert.isDefined(component)
    assert.equal(component?.attributes.value.type.kind, "unknown")
})

test("static hydrate から hydrateMode を抽出する", () => {
    const manifest = {
        modules: [
            {
                path: "./slider.js",
                declarations: [
                    {
                        name: "Slider",
                        tagName: "ph-slider",
                        members: [
                            { kind: "field", static: true, name: "hydrate", default: "lazy" },
                        ],
                    },
                ],
            },
        ],
    }

    const contracts = normalizeCemManifest(manifest, {
        sourceId: "pkg",
        manifestPath: "/project/custom-elements.json",
        registryKind: "file",
    })
    assert.equal(contracts.byComponentName.get("Slider")?.hydrateMode, "lazy")
})
