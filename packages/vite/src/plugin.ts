// Vite Plugin 本体

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Plugin } from "vite"
import type { PropsSchema } from "@pigeonhole/contracts"
import { loadConfig } from "./config/load-config"
import type { ComponentInfo } from "./component/types"
import { collectMdocFiles } from "./mdoc/collect-mdoc-files"
import { generateServerModule } from "./codegen/server-module"
import { generateClientModule } from "./codegen/client-module"
import { generateTypeDefinitions, generateVirtualModuleTypes } from "./codegen/type-definitions"
import { validateMdocFiles } from "./validation/validate-mdoc-files"
import { loadCemRegistry } from "./registry/load-cem"
import { normalizeCemManifest } from "./registry/normalize-cem"
import {
    componentContractToComponentInfo,
    componentContractToPropsSchema,
    type ComponentContract,
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

// Pigeonhole Vite プラグインを作成する
export function pigeonhole(): Plugin {
    let root: string
    let generatedComponents: ComponentInfo[] = []

    return {
        name: "pigeonhole",

        configResolved(resolvedConfig) {
            root = resolvedConfig.root
        },

        async buildStart() {
            const config = await loadConfig(root)
            const denyPatterns = config.denyPatterns
            const knownPackageImports = new Set<string>()

            const contractsByComponentName = new Map<string, ComponentContract>()
            for (const registry of config.componentRegistries) {
                const loaded = await loadCemRegistry(root, registry)
                validateCemManifest(loaded.manifest, loaded.sourceId)
                const normalized = normalizeCemManifest(loaded.manifest, {
                    sourceId: loaded.sourceId,
                    manifestPath: loaded.manifestPath,
                    registryKind: loaded.kind,
                    packageName: loaded.packageName,
                })

                for (const [name, contract] of normalized.byComponentName) {
                    const existing = contractsByComponentName.get(name)
                    if (existing) {
                        throw new Error(
                            `component name collision for "${name}": defined in both "${existing.source}" and "${contract.source}"`,
                        )
                    }
                    contractsByComponentName.set(name, contract)
                }

                if (loaded.packageName) {
                    knownPackageImports.add(loaded.packageName)
                }
            }

            const componentSchemaMap = new Map<string, PropsSchema>()
            const componentContractMap = new Map<string, ComponentContract>()
            const tagNameSourceMap = new Map<string, string>()

            generatedComponents = []
            for (const [componentName, contract] of contractsByComponentName) {
                registerTagName(tagNameSourceMap, componentName, contract.source)
                componentContractMap.set(componentName, contract)
                componentSchemaMap.set(componentName, componentContractToPropsSchema(contract))
                generatedComponents.push(componentContractToComponentInfo(contract))
            }

            generatedComponents.sort((a, b) => a.tagName.localeCompare(b.tagName))

            const mdocPages = await collectMdocFiles(root, config.pagesDir)
            validateMdocFiles(mdocPages, root, componentSchemaMap, denyPatterns, {
                knownPackageImports,
                componentContracts: componentContractMap,
                strictComplexTypes: config.strictComplexTypes,
            })

            // .pigeonhole/ 生成
            const outDir = join(root, ".pigeonhole")
            mkdirSync(outDir, { recursive: true })
            writeFileSync(join(outDir, "types.d.ts"), generateTypeDefinitions(generatedComponents))
            writeFileSync(join(outDir, "virtual-modules.d.ts"), generateVirtualModuleTypes())
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
                if (generatedComponents.length > 0) {
                    return generateServerModule(generatedComponents)
                }
                return [
                    "export const components = {};",
                    "export const propsSchemas = {};",
                    "export const hydrateComponents = new Map();",
                    "export const islandTagNames = {};",
                ].join("\n")
            }
            if (id === RESOLVED_VIRTUAL_CLIENT) {
                if (generatedComponents.length > 0) {
                    const islands = generatedComponents.filter((component) => component.hydrateMode !== "none")
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
