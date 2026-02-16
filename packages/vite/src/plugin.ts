// Vite Plugin 本体

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Plugin } from "vite"
import type { PropsSchema } from "@pigeonhole/render"
import { scanComponents } from "./scanner/scan-components"
import { scanMdocFiles } from "./scanner/scan-mdoc-files"
import type { ComponentInfo } from "./scanner/types"
import { generateServerModule } from "./codegen/server-module"
import { generateClientModule } from "./codegen/client-module"
import { generateTypeDefinitions, generateVirtualModuleTypes } from "./codegen/type-definitions"
import { validateMdocFiles } from "./validation/validate-mdoc-files"

// プラグインオプション
export interface PigeonholePluginOptions {
    /** authorInputPolicy.deny パターン（config-loader 実装まではこちらで直接指定） */
    denyPatterns?: string[]
}

// 仮想モジュール ID
const VIRTUAL_COMPONENTS = "virtual:pigeonhole/components"
const VIRTUAL_CLIENT = "virtual:pigeonhole/client"
const RESOLVED_VIRTUAL_COMPONENTS = `\0${VIRTUAL_COMPONENTS}`
const RESOLVED_VIRTUAL_CLIENT = `\0${VIRTUAL_CLIENT}`

// Pigeonhole Vite プラグインを作成する
export function pigeonhole(options?: PigeonholePluginOptions): Plugin {
    let root: string
    let scannedComponents: ComponentInfo[] = []

    return {
        name: "pigeonhole",

        configResolved(resolvedConfig) {
            root = resolvedConfig.root
        },

        async buildStart() {
            const denyPatterns = options?.denyPatterns ?? []

            // コンポーネントスキャン
            scannedComponents = await scanComponents(root)

            // .mdoc ファイルスキャン
            const mdocPages = await scanMdocFiles(root, "src/pages")
            const mdocComponents = await scanMdocFiles(root, "src/components")

            // タグ名衝突検知マップ
            const tagNameSourceMap = new Map<string, string>()

            // コンポーネント名 → PropsSchema マップ
            const componentSchemaMap = new Map<string, PropsSchema>()
            for (const component of scannedComponents) {
                const existing = tagNameSourceMap.get(component.tagName)
                if (existing) {
                    throw new Error(
                        `tag name collision for "${component.tagName}": defined in both "${existing}" and "${component.filePath}"`,
                    )
                }
                tagNameSourceMap.set(component.tagName, component.filePath)
                componentSchemaMap.set(component.tagName, component.propsSchema)
            }

            // .mdoc コンポーネントの input から PropsSchema を構築
            for (const mdocComponent of mdocComponents) {
                const fileName = mdocComponent.filePath.split("/").at(-1) ?? ""
                const tagName = fileName.replace(".mdoc", "")

                const existing = tagNameSourceMap.get(tagName)
                if (existing) {
                    throw new Error(
                        `tag name collision for "${tagName}": defined in both "${existing}" and "${mdocComponent.filePath}"`,
                    )
                }
                tagNameSourceMap.set(tagName, mdocComponent.filePath)

                const schema: PropsSchema = {}
                for (const input of mdocComponent.inputs) {
                    schema[input.variableName] = "string"
                }
                componentSchemaMap.set(tagName, schema)
            }

            // import 解決 + 属性検証
            validateMdocFiles(mdocPages, root, componentSchemaMap, denyPatterns)
            validateMdocFiles(mdocComponents, root, componentSchemaMap, denyPatterns)

            // .pigeonhole/*.d.ts 生成
            const outDir = join(root, ".pigeonhole")
            mkdirSync(outDir, { recursive: true })
            writeFileSync(join(outDir, "types.d.ts"), generateTypeDefinitions(scannedComponents))
            writeFileSync(join(outDir, "virtual-modules.d.ts"), generateVirtualModuleTypes())
        },

        resolveId(id) {
            if (id === VIRTUAL_COMPONENTS) {
                return RESOLVED_VIRTUAL_COMPONENTS
            }
            if (id === VIRTUAL_CLIENT) {
                return RESOLVED_VIRTUAL_CLIENT
            }
            return null
        },

        load(id) {
            if (id === RESOLVED_VIRTUAL_COMPONENTS) {
                if (scannedComponents.length > 0) {
                    return generateServerModule(scannedComponents)
                }
                return "export const components = {};"
            }
            if (id === RESOLVED_VIRTUAL_CLIENT) {
                if (scannedComponents.length > 0) {
                    const islands = scannedComponents.filter((component) => component.isIsland)
                    return generateClientModule(islands)
                }
                return [
                    'import "@lit-labs/ssr-client/lit-element-hydrate-support.js";',
                    'import { restoreIslandProps } from "pigeonhole/client";',
                    "restoreIslandProps();",
                    "export const islands = {};",
                ].join("\n")
            }
            return null
        },
    }
}
