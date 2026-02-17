import { assert, test } from "vitest"
import { extractPropsSchema } from "./extract-props-schema"

// interface 宣言からの抽出
test("interface 宣言から props スキーマを抽出する", () => {
    const source = `
interface CardProps {
    title: string;
    count: number;
    visible: boolean;
}
`
    const schema = extractPropsSchema(source, "CardProps")
    assert.deepEqual(schema, {
        title: { type: "string", optional: false },
        count: { type: "number", optional: false },
        visible: { type: "boolean", optional: false },
    })
})

// type alias 宣言からの抽出
test("type alias 宣言から props スキーマを抽出する", () => {
    const source = `
type CardProps = {
    title: string;
    count: number;
}
`
    const schema = extractPropsSchema(source, "CardProps")
    assert.deepEqual(schema, {
        title: { type: "string", optional: false },
        count: { type: "number", optional: false },
    })
})

// オプショナルプロパティ
test("オプショナルプロパティを optional: true として抽出する", () => {
    const source = `
interface CardProps {
    title: string;
    count?: number;
}
`
    const schema = extractPropsSchema(source, "CardProps")
    assert.deepEqual(schema, {
        title: { type: "string", optional: false },
        count: { type: "number", optional: true },
    })
})

// 文字列リテラル union
test("文字列リテラル union を string として分類する", () => {
    const source = `
interface ButtonProps {
    variant: "primary" | "secondary" | "danger";
}
`
    const schema = extractPropsSchema(source, "ButtonProps")
    assert.deepEqual(schema, {
        variant: { type: "string", optional: false },
    })
})

// 未知の型
test("大文字始まりの未知型を unknown として分類する", () => {
    const source = `
interface ListProps {
    items: Array<string>;
    data: CustomType;
}
`
    const schema = extractPropsSchema(source, "ListProps")
    assert.deepEqual(schema, {
        items: { type: "unknown", optional: false },
        data: { type: "unknown", optional: false },
    })
})

// 対象の interface が存在しない場合
test("対象の interface が存在しない場合は空オブジェクトを返す", () => {
    const source = `
interface OtherProps {
    title: string;
}
`
    const schema = extractPropsSchema(source, "CardProps")
    assert.deepEqual(schema, {})
})

// children を含む場合
test("children プロパティも抽出する", () => {
    const source = `
interface WrapperProps {
    children: string;
    title: string;
}
`
    const schema = extractPropsSchema(source, "WrapperProps")
    assert.deepEqual(schema, {
        children: { type: "string", optional: false },
        title: { type: "string", optional: false },
    })
})
