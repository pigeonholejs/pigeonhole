import { Tag } from "@markdoc/markdoc"

// transformater.ts の globalAttributes の値
const MARKDOC_GLOBAL_ATTRIBUTES = ["class", "id"]

/**
 * Tagから指定された属性を除去し、新しいTagを返す。
 * @param tag - 対象のMarkdoc Tag
 * @param excludes - 除去する属性名のリスト（デフォルト: ["class", "id"]）
 * @returns 指定属性が除去された新しいTag
 */
export function filterTagAttributes(tag: Tag, excludes: string[] = MARKDOC_GLOBAL_ATTRIBUTES): Tag {
    const filtered = { ...tag.attributes }
    for (const key of excludes) {
        delete filtered[key]
    }
    return new Tag(tag.name, filtered, tag.children)
}
