import zvmsConfig from "zvms-config";
import { ImplFiles, fApiIndexRaw, implsInitRaw, pathsGen, viewsInitRaw } from "zvms-apis-paths-gen";
import * as pathsData from "zvms-apis-paths-data";
import { userCatagories, authData } from "zvms-apis-users-data";
import { catagoriesGenTs, authGenTs, usersIndexRaw } from "zvms-apis-users-gen";
import { structs as structsData } from "zvms-apis-types-data";
import { structsDefGenTs, typesIndexRaw } from "zvms-apis-types-gen";

import * as fs from "./fs.js";

import { join } from "node:path";
import { format } from "prettier";

const { paths } = zvmsConfig;

export function main() {
    const todos = generate();
    prepare();
    apply(todos);
}

function generate(): (() => void)[] {
    let todos: (() => void)[] = [];

    let implFiles: ImplFiles = {};
    const fileList = fs.readdirSync(paths.b.impls);
    for(const file of fileList){
        implFiles[file] = fs.readFileSync(join(paths.b.impls,file));
    }

    todos.push(...pathsGen(pathsData, implFiles).map(
        ({ name, fApi, views, impls }) => (
            () => {
                fs.writeFileSync(join(paths.f.fApi, name + ".ts"), prettierTs(fApi));
                fs.writeFileSync(join(paths.b.views, name + ".py"), views);
                fs.writeFileSync(join(paths.b.impls, name + ".py"), impls);
            }
        )
    ));
    todos.push(() => {
        fs.writeFileSync(join(paths.f.fApi, "index.ts"), fApiIndexRaw);
        fs.writeFileSync(join(paths.b.views, "__init__.py"), viewsInitRaw);
        fs.writeFileSync(join(paths.b.impls, "__init__.py"), implsInitRaw);
    });

    todos.push(() => {
        fs.writeFileSync(join(paths.f.users, "catagories.ts"), prettierTs(catagoriesGenTs(userCatagories)));
        fs.writeFileSync(join(paths.f.users, "auth.ts"), prettierTs(authGenTs(authData)));
        fs.writeFileSync(join(paths.f.users, "index.ts"), usersIndexRaw);
    })

    todos.push(() => {
        fs.writeFileSync(join(paths.f.types, "structs.ts"), prettierTs(structsDefGenTs(structsData)));
        fs.writeFileSync(join(paths.f.types, "index.ts"), typesIndexRaw);
    })

    return todos;
}

function prepare() {
    const backupPath = join(paths.backup, `${Date.now()}`);
    fs.mkdirSync(backupPath);
    const backupList = [
        [paths.f.fApi, "f-fApi"],
        [paths.b.views, "b-views"],
        [paths.b.impls, "b-impls"],
        [paths.f.users, "f-users"],
        [paths.b.users, "b-users"],
        [paths.f.types, "f-types"],
        [paths.b.types, "b-types"]
    ];
    for (const item of backupList) {
        fs.cpSync(item[0], join(backupPath, item[1]), { recursive: true });
    }
}

function apply(todos: (() => void)[]) {
    todos.forEach(v => v());
}

function prettierTs(str: string) {
    return format(str, { parser: "typescript" });
}