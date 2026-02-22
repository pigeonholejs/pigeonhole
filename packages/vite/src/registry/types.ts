import type { PropsSchema } from "@pigeonhole/contracts"
import type { HydrateMode } from "../component/types"
import type { ComponentInfo } from "../component/types"

export type PrimitiveType = "string" | "number" | "boolean"

export type ContractType =
    | {
          kind: "primitive"
          primitive: PrimitiveType
          rawText: string
      }
    | {
          kind: "literal-union"
          primitive: PrimitiveType | "mixed"
          literals: Array<string | number | boolean>
          rawText: string
      }
    | {
          kind: "reference"
          references: string[]
          rawText: string
      }
    | {
          kind: "complex"
          references: string[]
          rawText: string
      }
    | {
          kind: "unknown"
          rawText: string
      }

export interface AttributeContract {
    name: string
    required: boolean
    type: ContractType
}

export interface ComponentContract {
    componentName: string
    customElementTagName: string
    moduleSpecifier: string
    hydrateMode: HydrateMode
    source: string
    attributes: Record<string, AttributeContract>
}

export function contractTypeToPropsType(type: ContractType): string {
    if (type.kind === "primitive") {
        return type.primitive
    }

    if (type.kind === "literal-union" && type.primitive !== "mixed") {
        return type.primitive
    }

    return "unknown"
}

export function componentContractToPropsSchema(contract: ComponentContract): PropsSchema {
    const schema: PropsSchema = {}
    for (const [name, attribute] of Object.entries(contract.attributes)) {
        schema[name] = { type: contractTypeToPropsType(attribute.type) }
    }
    return schema
}

export function componentContractToComponentInfo(contract: ComponentContract): ComponentInfo {
    return {
        tagName: contract.componentName,
        customElementTagName: contract.customElementTagName,
        moduleSpecifier: contract.moduleSpecifier,
        hydrateMode: contract.hydrateMode,
        propsSchema: componentContractToPropsSchema(contract),
    }
}
