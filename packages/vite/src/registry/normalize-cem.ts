import type { AttributeContract, ComponentContract, ContractType, PrimitiveType } from "./types"

interface CEMTypeReference {
    name?: string
}

interface CEMType {
    text?: string
    references?: CEMTypeReference[]
}

interface CEMAttribute {
    name?: string
    type?: CEMType
    default?: unknown
}

interface CEMMember {
    kind?: string
    name?: string
    attribute?: string | boolean
    type?: CEMType
    default?: unknown
}

interface CEMDeclaration {
    name?: string
    tagName?: string
    attributes?: CEMAttribute[]
    members?: CEMMember[]
}

interface CEMExport {
    kind?: string
    name?: string
    declaration?: {
        name?: string
    }
}

interface CEMModule {
    declarations?: CEMDeclaration[]
    exports?: CEMExport[]
}

interface CEMManifest {
    modules?: CEMModule[]
}

export interface NormalizedCemContracts {
    byComponentName: Map<string, ComponentContract>
    byCustomElementTagName: Map<string, ComponentContract>
}

function normalizePrimitive(text: string): PrimitiveType | null {
    const value = text.trim()
    if (value === "string" || value === "String") {
        return "string"
    }
    if (value === "number" || value === "Number") {
        return "number"
    }
    if (value === "boolean" || value === "Boolean") {
        return "boolean"
    }
    return null
}

function parseLiteral(token: string): string | number | boolean | null {
    const trimmed = token.trim()
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1)
    }
    if (trimmed === "true") {
        return true
    }
    if (trimmed === "false") {
        return false
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed)
    }
    return null
}

function classifyType(type: CEMType | undefined): ContractType {
    const rawText = type?.text?.trim() ?? ""
    const references = (type?.references ?? [])
        .map((reference) => reference.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0)

    if (rawText.length === 0) {
        return { kind: "unknown", rawText }
    }

    const primitive = normalizePrimitive(rawText)
    if (primitive) {
        return { kind: "primitive", primitive, rawText }
    }

    const unionTokens = rawText
        .split("|")
        .map((token) => token.trim())
        .filter((token) => token.length > 0)

    if (unionTokens.length > 1) {
        const nonNullable = unionTokens.filter((token) => token !== "undefined" && token !== "null")
        const unionPrimitives = nonNullable.map(normalizePrimitive)
        if (nonNullable.length > 0 && unionPrimitives.every((value) => value !== null)) {
            const first = unionPrimitives[0]
            if (unionPrimitives.every((value) => value === first) && first !== null) {
                return { kind: "primitive", primitive: first, rawText }
            }
        }

        const literals = unionTokens.map(parseLiteral)
        if (literals.every((literal) => literal !== null)) {
            const concreteLiterals = literals as Array<string | number | boolean>
            const literalKinds = new Set(concreteLiterals.map((literal) => typeof literal))
            const literalPrimitive: PrimitiveType | "mixed" =
                literalKinds.size === 1
                    ? (Array.from(literalKinds)[0] as PrimitiveType)
                    : "mixed"
            return {
                kind: "literal-union",
                literals: concreteLiterals,
                primitive: literalPrimitive,
                rawText,
            }
        }
    }

    if (references.length > 0 || /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(rawText)) {
        return {
            kind: "reference",
            references,
            rawText,
        }
    }

    return {
        kind: "complex",
        references,
        rawText,
    }
}

function toPascalFromKebab(tagName: string): string {
    return tagName
        .split("-")
        .filter((part) => part.length > 0)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join("")
}

function ensureAttribute(
    attributes: Record<string, AttributeContract>,
    name: string,
    type: CEMType | undefined,
    required: boolean,
): void {
    if (name in attributes) {
        return
    }

    attributes[name] = {
        name,
        required,
        type: classifyType(type),
    }
}

function declarationToContract(
    declaration: CEMDeclaration,
    source: string,
    tagName: string,
): ComponentContract | null {
    const componentName = declaration.name ?? toPascalFromKebab(tagName)
    if (componentName.length === 0) {
        return null
    }

    const attributes: Record<string, AttributeContract> = {}

    for (const attribute of declaration.attributes ?? []) {
        if (typeof attribute.name !== "string" || attribute.name.length === 0) {
            continue
        }
        ensureAttribute(attributes, attribute.name, attribute.type, attribute.default === undefined)
    }

    for (const member of declaration.members ?? []) {
        if (member.kind !== "field" || typeof member.name !== "string" || member.name.length === 0) {
            continue
        }
        if (member.attribute === false) {
            continue
        }

        const attributeName =
            typeof member.attribute === "string"
                ? member.attribute
                : member.attribute === true
                  ? member.name
                  : undefined

        if (!attributeName || attributeName.length === 0) {
            continue
        }

        ensureAttribute(attributes, attributeName, member.type, member.default === undefined)
    }

    return {
        componentName,
        customElementTagName: tagName,
        source,
        attributes,
    }
}

export function normalizeCemManifest(manifest: unknown, source: string): NormalizedCemContracts {
    const byComponentName = new Map<string, ComponentContract>()
    const byCustomElementTagName = new Map<string, ComponentContract>()
    const typed = manifest as CEMManifest

    for (const moduleEntry of typed.modules ?? []) {
        const customElementExportMap = new Map<string, string>()
        for (const exportEntry of moduleEntry.exports ?? []) {
            if (
                exportEntry.kind === "custom-element-definition" &&
                typeof exportEntry.name === "string" &&
                typeof exportEntry.declaration?.name === "string"
            ) {
                customElementExportMap.set(exportEntry.declaration.name, exportEntry.name)
            }
        }

        for (const declaration of moduleEntry.declarations ?? []) {
            const tagName =
                (typeof declaration.tagName === "string" ? declaration.tagName : undefined) ??
                (typeof declaration.name === "string"
                    ? customElementExportMap.get(declaration.name)
                    : undefined)

            if (!tagName || tagName.length === 0) {
                continue
            }

            const contract = declarationToContract(declaration, source, tagName)
            if (!contract) {
                continue
            }

            byComponentName.set(contract.componentName, contract)
            byCustomElementTagName.set(contract.customElementTagName, contract)
        }
    }

    return { byComponentName, byCustomElementTagName }
}

