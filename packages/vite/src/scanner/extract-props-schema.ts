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

// Lit の @property デコレータの type オプションから型文字列へのマッピング
const LIT_TYPE_MAP: Record<string, string> = {
    Number: "number",
    String: "string",
    Boolean: "boolean",
}

// Lit の @property デコレータから props スキーマを抽出する
function extractLitPropertySchema(source: string): PropsSchema {
    const schema: PropsSchema = {}

    // @property({ type: Number }) count = 0
    // @property({ type: String }) name = ""
    // @property() value = ""  （type 省略時は string として扱う）
    const propertyRegex = /@property\(\s*(?:\{\s*(?:[^}]*\btype:\s*(\w+))?[^}]*\})?\s*\)\s*(\w+)/g
    let match = propertyRegex.exec(source)
    while (match !== null) {
        const [, litType, name] = match
        const type = litType ? (LIT_TYPE_MAP[litType] ?? "unknown") : "string"
        schema[name] = { type, optional: true }
        match = propertyRegex.exec(source)
    }

    return schema
}

// TypeScript ソースから props スキーマを regex 抽出する
// 1. まず ${tagName}Props インターフェースを探す
// 2. 見つからなければ Lit の @property デコレータから抽出する
export function extractPropsSchema(source: string, interfaceName: string): PropsSchema {
    const schema: PropsSchema = {}

    const interfaceRegex = new RegExp(`interface\\s+${interfaceName}\\s*\\{([^}]*)\\}`, "s")
    const typeAliasRegex = new RegExp(`type\\s+${interfaceName}\\s*=\\s*\\{([^}]*)\\}`, "s")

    const match = interfaceRegex.exec(source) ?? typeAliasRegex.exec(source)
    if (match) {
        const body = match[1]

        // 各プロパティを解析する
        const propertyRegex = /(\w+)(\??):\s*([^;]+)/g
        let propertyMatch = propertyRegex.exec(body)
        while (propertyMatch !== null) {
            const [, name, optional, rawType] = propertyMatch
            schema[name] = { type: classifyType(rawType), optional: optional === "?" }
            propertyMatch = propertyRegex.exec(body)
        }

        return schema
    }

    // インターフェースが見つからない場合、Lit の @property デコレータから抽出する
    const litSchema = extractLitPropertySchema(source)
    if (Object.keys(litSchema).length > 0) {
        return litSchema
    }

    return schema
}
