// 【M3】素材树可打包性守门:npm 内置排除表把 .gitignore 等特定点文件名硬踢出 tarball,
// 且无法用 .npmignore 反向加回(2026-09-14 npm pack 探针实测)。素材树里出现这些名字 =
// 发布后素材丢失,安装版 CLI 生成时 readTemplate 直接崩。因此点文件素材一律用 `_` 前缀
// 命名,生成时换回 `.` 开头(约定同 create-vite 的 _gitignore)。
// 两条断言必须成对存在:只禁点文件会被"删掉素材"满足,只查素材会在某天被加点文件绕开。
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { templatesRoot } from "./project";
import { listScenarioCases } from "./scenarioCase";

// npm 内置排除表实测名单:这些名字永不进 tarball(.env/.editorconfig/.babelrc 等点文件反而正常进包)
const NPM_BANNED = [".gitignore", ".npmrc", ".DS_Store", "npm-debug.log"];

function walk(dir: string, prefix = ""): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...walk(full, join(prefix, entry)));
        } else {
            out.push(join(prefix, entry));
        }
    }
    return out;
}

describe("templates 素材可打包性", () => {
    it("素材树不含 npm 内置排除表里的名字", () => {
        const offenders = walk(templatesRoot()).filter((rel) => {
            const segs = rel.split("/");
            return NPM_BANNED.some((b) => segs.includes(b)) || segs.includes(".git");
        });
        expect(offenders).toEqual([]);
    });

    it("点文件素材以 _ 前缀在位(base 与每个精选案例)", () => {
        expect(existsSync(join(templatesRoot(), "_gitignore"))).toBe(true);
        for (const caseId of listScenarioCases()) {
            expect(
                existsSync(join(templatesRoot(), "scenarios", caseId, "_gitignore")),
                `${caseId}/_gitignore`,
            ).toBe(true);
        }
    });

    it("UI 组件与样式素材成对在位(组件 .tsx 必有同名 .module.css)", () => {
        const surfaces = join(templatesRoot(), "atoms", "ui", "src", "client", "surfaces");
        const components = walk(surfaces).filter((f) => f.endsWith(".tsx"));
        expect(components.length).toBeGreaterThan(0);
        for (const rel of components) {
            const css = rel.replace(/\.tsx$/, ".module.css");
            expect(existsSync(join(surfaces, css)), `${css} 缺失`).toBe(true);
        }
        // CSS Modules 的 TS 契约声明在位(组件里 import "*.module.css" 依赖它)
        expect(existsSync(join(templatesRoot(), "atoms", "ui", "src", "css-modules.d.ts"))).toBe(true);
    });

    it("UI 精选案例:样式与类型契约、@tsdown/css 在位", () => {
        for (const caseId of ["quick-tool", "model-gateway"]) {
            const root = join(templatesRoot(), "scenarios", caseId);
            expect(existsSync(join(root, "src", "css-modules.d.ts")), `${caseId}/css-modules.d.ts`).toBe(true);
            const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
                devDependencies?: Record<string, string>;
            };
            expect(pkg.devDependencies?.["@tsdown/css"], `${caseId} devDeps @tsdown/css`).toBe("^0.23.0");
            const tsdownCfg = readFileSync(join(root, "tsdown.config.ts"), "utf8");
            expect(tsdownCfg).toContain("dshp-inline-client-css");
        }
    });
});
