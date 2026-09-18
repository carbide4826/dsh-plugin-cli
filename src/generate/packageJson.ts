// package.json 生成器:四名称 + 三桶依赖 + bundle 声明 + UI 的 client 出口
import type { Answers } from "../domain/types";
import { UI_SURFACES } from "../domain/uiSurfaces";
import {
    SUPPORTED_CORDIS_VERSION,
    SUPPORTED_DSH_VERSION,
    type DepBuckets,
} from "../domain/deps";

// 工具链版本(dsh rc 线之外;react 系对齐官方 ui 包的声明)
const TOOLCHAIN: Record<string, string> = {
    tsdown: "^0.23.0",
    "@tsdown/css": "^0.23.0", // tsdown 的 CSS 管线(仅 UI 项目进 devDeps),与 tsdown 同版线
    typescript: "^5.6.0",
    "@types/node": "^22.10.0",
    "@types/react": "~18.3.1",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    "@deepseek-ai/schemastery": "^3.18.2", // 独立稳定线,非 dsh rc 线
};

/** 查一个依赖包的版本声明;未知包直接抛错(上游清单变了宁可炸也别瞎写) */
function versionFor(pkg: string): string {
    if (pkg === "@deepseek-ai/cordis") return SUPPORTED_CORDIS_VERSION;
    if (pkg.startsWith("@deepseek-ai/dsh-")) return SUPPORTED_DSH_VERSION; // dist-tag 陷阱:精确钉死
    const v = TOOLCHAIN[pkg];
    if (v === undefined) throw new Error(`未知依赖包,请补版本映射: ${pkg}`);
    return v;
}

/** 依赖清单 → 排序后的 { 包名: 版本 } 记录 */
function bucketToRecord(pkgs: string[]): Record<string, string> {
    return Object.fromEntries([...pkgs].sort().map((p) => [p, versionFor(p)]));
}

/**
 * 生成 package.json 内容
 * @param answers - 完整问卷答案
 * @param deps - 三桶依赖(collectDeps 结果)
 * @returns package.json 文件内容(JSON,2 空格缩进)
 */
export function generatePackageJson(
    answers: Answers,
    deps: DepBuckets,
): string {
    const ui = answers.atoms.includes("ui");

    // dsh 键:bundle 声明(库包不加,不激活任何层)+ UI 的 client 声明(勾选界面位的 Owner 包)
    const dsh: Record<string, unknown> = {};
    if (answers.pkgPosition === "bundle") {
        dsh.bundle = { patch: "./cordis.patch.yml" };
    }
    if (ui) {
        const owners = UI_SURFACES.filter((s) =>
            answers.uiSurfaces.includes(s.id),
        ).map((s) => s.pkg);
        // ui-slots 必须注入:client/index.ts 的 inject = ['slots'] 依赖宿主提供 slots 服务,
        // 缺了它 ctx.slots 为 undefined,全部界面位注册静默失效(对照社区插件 dsh-project-memory)
        const inject = [
            ...new Set([
                "@deepseek-ai/dsh-client-ui-renderer",
                "@deepseek-ai/dsh-client-ui-slots",
                ...owners,
            ]),
        ].sort();
        dsh.client = { inject, platform: "web" };
    }

    const pkg: Record<string, unknown> = {
        name: answers.pkgName,
        version: "0.1.0",
        description: answers.description,
        type: "module",
        ...(answers.author ? { author: answers.author } : {}),
        license: "MIT",
        // 身份声明紧跟元数据:向 harness 宣告这个包是什么,不落到文件尾
        ...(Object.keys(dsh).length > 0 ? { dsh } : {}),
        engines: { node: "^22.19.0 || >=24.0.0" },
        scripts: {
            // 入口在项目自带的 tsdown.config.ts(UI 双出口),就近优先、不被祖先配置劫持
            build: "tsdown",
            typecheck: "tsc --noEmit",
        },
        // 出口无条件声明(loader 按此解析入口);扩展名 .js 由 tsdown.config.ts 的 outExtensions 钉死
        exports: {
            ".": "./dist/index.js",
            ...(ui ? { "./client": "./dist/client.js" } : {}),
            // patch 文件也要能按 exports 解析到(dsh plugin add 读包内路径;社区插件同款防御)
            ...(answers.pkgPosition === "bundle"
                ? { "./cordis.patch.yml": "./cordis.patch.yml" }
                : {}),
        },
        // 进包白名单:显式列出,否则 npm 会回落到 .gitignore 当黑名单——而 .gitignore 排除了 dist/,
        // 结果是产物被漏、src/ 与构建配置反被打进包(README.md / package.json 为 npm 强制包含项,无需列出)
        files: [
            "dist",
            ...(answers.pkgPosition === "bundle" ? ["cordis.patch.yml"] : []),
        ],
        dependencies: bucketToRecord(deps.deps),
        peerDependencies: bucketToRecord(deps.peer),
        devDependencies: bucketToRecord(deps.dev),
    };
    return JSON.stringify(pkg, null, 2) + "\n";
}
