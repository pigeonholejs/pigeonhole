import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join } from "node:path"
import type { ComponentRegistryConfig } from "../config/schema"

const require = createRequire(import.meta.url)

export interface LoadedCemRegistry {
    sourceId: string
    manifest: unknown
    manifestPath: string
    kind: ComponentRegistryConfig["kind"]
    packageName?: string
}

async function readJson(path: string): Promise<unknown> {
    const content = await readFile(path, "utf-8")
    return JSON.parse(content) as unknown
}

export async function loadCemRegistry(
    root: string,
    registry: ComponentRegistryConfig,
): Promise<LoadedCemRegistry> {
    if (registry.kind === "file") {
        const path = isAbsolute(registry.path) ? registry.path : join(root, registry.path)
        if (!existsSync(path)) {
            throw new Error(`CEM file does not exist: "${path}"`)
        }

        return {
            sourceId: path,
            manifest: await readJson(path),
            manifestPath: path,
            kind: "file",
        }
    }

    const packageJsonPath = require.resolve(`${registry.packageName}/package.json`, {
        paths: [root],
    })
    const packageDir = dirname(packageJsonPath)
    const packageJson = (await readJson(packageJsonPath)) as {
        customElements?: string
    }

    const cemPath = join(
        packageDir,
        registry.cemPath ?? packageJson.customElements ?? "custom-elements.json",
    )
    if (!existsSync(cemPath)) {
        throw new Error(
            `CEM file for package "${registry.packageName}" does not exist: "${cemPath}"`,
        )
    }

    return {
        sourceId: `${registry.packageName}:${cemPath}`,
        packageName: registry.packageName,
        manifest: await readJson(cemPath),
        manifestPath: cemPath,
        kind: "package",
    }
}
