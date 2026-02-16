import type { PropsSchema } from "@pigeonhole/render"

// 既知の基本型
const KNOWN_PRIMITIVE_TYPES = new Set(["string", "number", "boolean"])

// 型文字列を分類する
function classifyType(typeString: string): string {
    const trimmed = typeString.trim()

    if (KNOWN_PRIMITIVE_TYPES.has(trimmed)) {
        return trimmed
    }

    // 文字列リテラル union → string として扱う
    if (trimmed.includes('"') || trimmed.includes("'")) {
        return "string"
    }

    // Array<...> やジェネリクス型 → unknown
    if (trimmed.includes("<")) {
        return "unknown"
    }

    // 大文字始まりの未知型 → unknown（警告付き）
    if (/^[A-Z]/.test(trimmed)) {
        console.warn(
            `[pigeonhole] unresolvable type "${trimmed}" detected in props schema, treating as "unknown"`,
        )
        return "unknown"
    }

    return trimmed
}

// TypeScript ソースから props スキーマを regex 抽出する
export function extractPropsSchema(source: string, interfaceName: string): PropsSchema {
    const schema: PropsSchema = {}

    const interfaceRegex = new RegExp(`interface\\s+${interfaceName}\\s*\\{([^}]*)\\}`, "s")
    const typeAliasRegex = new RegExp(`type\\s+${interfaceName}\\s*=\\s*\\{([^}]*)\\}`, "s")

    const match = interfaceRegex.exec(source) ?? typeAliasRegex.exec(source)
    if (!match) {
        return schema
    }

    const body = match[1]

    // 各プロパティを解析する
    const propertyRegex = /(\w+)(\??):\s*([^;]+)/g
    let propertyMatch = propertyRegex.exec(body)
    while (propertyMatch !== null) {
        const [, name, optional, rawType] = propertyMatch
        const key = optional === "?" ? `${name}?` : name
        schema[key] = classifyType(rawType)
        propertyMatch = propertyRegex.exec(body)
    }

    return schema
}
