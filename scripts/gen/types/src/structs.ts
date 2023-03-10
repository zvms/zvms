import { Type } from "./types.js";

export type StructRaw = Record<string, Type>;

export type StructsRaw = Record<string, StructRaw>;

export type Structs<Raw> = Record<keyof Raw, Type & {
    tsDef: string,
    pyDef: string,
    ckDef: string,
    raw: StructRaw
}>;

export function createStructs<Raw extends StructsRaw>(raw: Raw): Structs<Raw> {
    const result: Structs<Raw> = {} as any;
    for (const name in raw) {
        const struct = raw[name];
        let tsDef = `export interface ${name}{\n`;
        let pyDef = `${name} = typing.TypedDict('${name}', {\n`;
        let ckDef = `${name} = Object(\n`;
        for (const key in struct) {
            const type = struct[key];
            tsDef += `    ${key}: ${type.ts};\n`;
            pyDef += `    '${key}': ${type.py},\n`;
            ckDef += `    ${key}=${type.ck},\n`;
        }
        tsDef = (tsDef + "}")
            .replaceAll("structs.", "");// This is bad!
        pyDef = (pyDef.slice(0, -2) + "\n})")
            .replaceAll("structs.", "");// This is bad!
        ckDef = (ckDef.slice(0, -2) + "\n)")
            .replaceAll("structs.ck.", "");// This is bad!
        result[name] = {
            tsDef,
            pyDef,
            ckDef,
            raw: struct,
            ts: `structs.${name}`,
            py: `structs.${name}`,
            ck: `structs.ck.${name}`
        }
    }
    return result;
}

export function createDangerousStructRef(name: string): Type {
    return {
        ts: `structs.${name}`,
        py: `structs.${name}`,
        ck: `structs.ck.${name}`
    }
}

export function structsDefGenTs(data: Structs<any>): string {
    let str = `import * as enums from "./enums.js";`;
    for (const name in data) {
        const struct = data[name];
        str += "\n" + struct.tsDef;
    }
    return str;
}

export function structsDefGenPy(data: Structs<any>): string {
    let str = `import typing\n\n`;
    for (const name in data) {
        const struct = data[name];
        str += "\n" + struct.pyDef;
    }
    return str + "\n";
}

export function structsDefGenCk(data: Structs<any>): string {
    let str = `from zvms.typing.checker import *
from zvms.res.enums import *\n\n`;
    for (const name in data) {
        const struct = data[name];
        str += "\n" + struct.ckDef;
    }
    return str + "\n";
}