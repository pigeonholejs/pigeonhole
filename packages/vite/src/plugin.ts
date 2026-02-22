// Vite Plugin 本体

import { mkdirSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import type { Plugin } from "vite"
import type { PropsSchema } from "@pigeonhole/render"
import { loadConfig } from "./config/load-config"
import { scanComponents } from "./scanner/scan-components"
import { scanMdocFiles } from "./scanner/scan-mdoc-files"
import type { ComponentInfo } from "./scanner/types"
import { generateServerModule } from "./codegen/server-module"
import { generateClientModule } from "./codegen/client-module"
import { generateTypeDefinitions, generateVirtualModuleTypes } from "./codegen/type-definitions"
import { validateMdocFiles } from "./validation/validate-mdoc-files"
import { loadCemRegistry } from "./registry/load-cem"
import { normalizeCemManifest } from "./registry/normalize-cem"
import {
    componentContractToPropsSchema,
    type ComponentContract,
    type AttributeContract,
} from "./registry/types"
import { validateCemManifest } from "./registry/validate-cem"

// 仮想モジュール ID
const VIRTUAL_COMPONENTS = "virtual:pigeonhole/components"
const VIRTUAL_CLIENT = "virtual:pigeonhole/client"
const RESOLVED_VIRTUAL_COMPONENTS = `\0${VIRTUAL_COMPONENTS}`
const RESOLVED_VIRTUAL_CLIENT = `\0${VIRTUAL_CLIENT}`

// タグ名衝突を検知し、衝突があればエラーを投げる
function registerTagName(
    tagNameSourceMap: Map<string, string>,
    tagName: string,
    filePath: string,
): void {
    const existing = tagNameSourceMap.get(tagName)
    if (existing) {
        throw new Error(
            `tag name collision for "${tagName}": defined in both "${existing}" and "${filePath}"`,
        )
    }
    tagNameSourceMap.set(tagName, filePath)
}

function cloneContractWithName(contract: ComponentContract, componentName: string): ComponentContract {
    const attributes: Record<string, AttributeContract> = {}
    for (const [name, value] of Object.entries(contract.attributes)) {
        attributes[name] = {
            name: value.name,
            required: value.required,
            type: value.type,
        }
    }

    return {
        componentName,
        customElementTagName: contract.customElementTagName,
        source: contract.source,
        attributes,
    }
}

function mergeContracts(
    targetByComponentName: Map<string, ComponentContract>,
    targetByCustomElementTagName: Map<string, ComponentContract>,
    contracts: ReturnType<typeof normalizeCemManifest>,
): void {
    for (const [name, contract] of contracts.byComponentName) {
        targetByComponentName.set(name, contract)
    }
    for (const [name, contract] of contracts.byCustomElementTagName) {
        targetByCustomElementTagName.set(name, contract)
    }
}

// Pigeonhole Vite プラグインを作成する
export function pigeonhole(): Plugin {
    let root: string
    let scannedComponents: ComponentInfo[] = []

    return {
        name: "pigeonhole",

        configResolved(resolvedConfig) {
            root = resolvedConfig.root
        },

        async buildStart() {
            const config = await loadConfig(root)
            const denyPatterns = config.denyPatterns
            const knownPackageImports = new Set<string>()

            const cemContractsByComponentName = new Map<string, ComponentContract>()
            const cemContractsByCustomElementTagName = new Map<string, ComponentContract>()
            for (const registry of config.componentRegistries) {
                const loaded = await loadCemRegistry(root, registry)
                validateCemManifest(loaded.manifest, loaded.sourceId)
                mergeContracts(
                    cemContractsByComponentName,
                    cemContractsByCustomElementTagName,
                    normalizeCemManifest(loaded.manifest, loaded.sourceId),
                )
                if (loaded.packageName) {
                    knownPackageImports.add(loaded.packageName)
                }
            }

            // コンポーネントスキャン
            scannedComponents = await scanComponents(root, config.componentsDir)

            // .mdoc ファイルスキャン
            const mdocPages = await scanMdocFiles(root, config.pagesDir)
            const mdocComponents = await scanMdocFiles(root, config.componentsDir)

            // タグ名衝突検知マップ
            const tagNameSourceMap = new Map<string, string>()

            // コンポーネント名 → PropsSchema マップ
            const componentSchemaMap = new Map<string, PropsSchema>()
            const componentContractMap = new Map<string, ComponentContract>()
            for (const component of scannedComponents) {
                registerTagName(tagNameSourceMap, component.tagName, component.filePath)

                const matchedContract =
                    cemContractsByComponentName.get(component.tagName) ??
                    (component.customElementTagName
                        ? cemContractsByCustomElementTagName.get(component.customElementTagName)
                        : undefined)

                if (matchedContract) {
                    const renamed = cloneContractWithName(matchedContract, component.tagName)
                    componentContractMap.set(component.tagName, renamed)
                    component.propsSchema = componentContractToPropsSchema(renamed)
                }

                componentSchemaMap.set(component.tagName, component.propsSchema)
            }

            // 外部 CEM コンポーネント（ローカル scan 対象外）を補完
            for (const [name, contract] of cemContractsByComponentName) {
                if (componentSchemaMap.has(name)) {
                    continue
                }
                registerTagName(tagNameSourceMap, name, contract.source)
                componentContractMap.set(name, contract)
                componentSchemaMap.set(name, componentContractToPropsSchema(contract))
            }

            // .mdoc コンポーネントの input から PropsSchema を構築
            for (const mdocComponent of mdocComponents) {
                const fileName = basename(mdocComponent.filePath)
                const tagName = fileName.replace(".mdoc", "")

                registerTagName(tagNameSourceMap, tagName, mdocComponent.filePath)

                const schema: PropsSchema = {}
                for (const input of mdocComponent.inputs) {
                    schema[input.variableName] = { type: "string" }
                }
                componentSchemaMap.set(tagName, schema)
            }

            // import 解決 + 属性検証
            validateMdocFiles(mdocPages, root, componentSchemaMap, denyPatterns, {
                knownPackageImports,
                componentContracts: componentContractMap,
                strictComplexTypes: config.strictComplexTypes,
            })
            validateMdocFiles(mdocComponents, root, componentSchemaMap, denyPatterns, {
                knownPackageImports,
                componentContracts: componentContractMap,
                strictComplexTypes: config.strictComplexTypes,
            })

            // .pigeonhole/ 生成
            const outDir = join(root, ".pigeonhole")
            mkdirSync(outDir, { recursive: true })
            writeFileSync(join(outDir, "types.d.ts"), generateTypeDefinitions(scannedComponents))
            writeFileSync(join(outDir, "virtual-modules.d.ts"), generateVirtualModuleTypes())
            // クライアントエントリポイント: Vite がモジュールリクエストとして処理し virtual module を解決する
            writeFileSync(join(outDir, "client-entry.js"), 'import "virtual:pigeonhole/client";\n')
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
                    const islands = scannedComponents.filter(
                        (component) => component.hydrateMode !== "none",
                    )
                    return generateClientModule(islands)
                }
                return [
                    'import "@lit-labs/ssr-client/lit-element-hydrate-support.js";',
                    'import { restoreIslandProps } from "@pigeonhole/render/client";',
                    "restoreIslandProps();",
                    "export const islands = {};",
                ].join("\n")
            }
            return null
        },
    }
}
