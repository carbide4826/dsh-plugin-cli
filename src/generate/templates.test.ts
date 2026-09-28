// 素材树可打包性守门:npm 内置排除表把 .gitignore 等特定点文件名硬踢出 tarball,
// 且无法用 .npmignore 反向加回。素材树里出现这些名字 =
// 发布后素材丢失,安装版 CLI 生成时 readTemplate 直接崩。因此点文件素材一律用 `_` 前缀
// 命名,生成时换回 `.` 开头(约定同 create-vite 的 _gitignore)。
// 两条断言必须成对存在:只禁点文件会被"删掉素材"满足,只查素材会在某天被加点文件绕开。
// 双轨:latest 与 next 两棵树各自过一遍同一组守门(树与 manifest 严格配对的素材侧)。
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { templatesRoot } from "./project";
import { listScenarioCases } from "./scenarioCase";
import { LATEST_MANIFEST, NEXT_MANIFEST, TRACK_TARGETS, type TrackTarget } from "../domain/manifests";

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

describe.each(TRACK_TARGETS.map((t) => [t] as const))("templates 素材可打包性(%s 轨)", (target: TrackTarget) => {
    it("素材树不含 npm 内置排除表里的名字", () => {
        const offenders = walk(templatesRoot(target)).filter((rel) => {
            const segs = rel.split("/");
            return NPM_BANNED.some((b) => segs.includes(b)) || segs.includes(".git");
        });
        expect(offenders).toEqual([]);
    });

    it("点文件素材以 _ 前缀在位(base 与每个精选案例)", () => {
        expect(existsSync(join(templatesRoot(target), "_gitignore"))).toBe(true);
        for (const caseId of listScenarioCases(target === "latest" ? LATEST_MANIFEST : NEXT_MANIFEST)) {
            expect(
                existsSync(join(templatesRoot(target), "scenarios", caseId, "_gitignore")),
                `${caseId}/_gitignore`,
            ).toBe(true);
        }
    });

    it("UI 组件与样式素材成对在位(组件 .tsx 必有同名 .module.css)", () => {
        const surfaces = join(templatesRoot(target), "atoms", "ui", "src", "client", "surfaces");
        const components = walk(surfaces).filter((f) => f.endsWith(".tsx"));
        expect(components.length).toBeGreaterThan(0);
        for (const rel of components) {
            const css = rel.replace(/\.tsx$/, ".module.css");
            expect(existsSync(join(surfaces, css)), `${css} 缺失`).toBe(true);
        }
        // CSS Modules 的 TS 契约声明在位(组件里 import "*.module.css" 依赖它)
        expect(existsSync(join(templatesRoot(target), "atoms", "ui", "src", "css-modules.d.ts"))).toBe(true);
    });

    it("UI 精选案例:样式与类型契约、@tsdown/css 在位", () => {
        for (const caseId of ["quick-tool", "model-gateway"]) {
            const root = join(templatesRoot(target), "scenarios", caseId);
            expect(existsSync(join(root, "src", "css-modules.d.ts")), `${caseId}/css-modules.d.ts`).toBe(true);
            const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
                devDependencies?: Record<string, string>;
            };
            expect(pkg.devDependencies?.["@tsdown/css"], `${caseId} devDeps @tsdown/css`).toBe("^0.23.0");
            const tsdownCfg = readFileSync(join(root, "tsdown.config.ts"), "utf8");
            expect(tsdownCfg).toContain("dshp-inline-client-css");
        }
    });

    it("插件图标素材在位(base 与每个精选案例,package.json.icon 指向它)", () => {
        // 清单详情页经 package-meta 读 package.json.icon(包内相对路径);素材缺失 = 详情页无图标
        expect(existsSync(join(templatesRoot(target), "icon.svg")), "base icon.svg").toBe(true);
        for (const caseId of listScenarioCases(target === "latest" ? LATEST_MANIFEST : NEXT_MANIFEST)) {
            const root = join(templatesRoot(target), "scenarios", caseId);
            expect(existsSync(join(root, "icon.svg")), `${caseId}/icon.svg`).toBe(true);
            const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
                icon?: string;
            };
            expect(pkg.icon, `${caseId} package.json.icon`).toBe("icon.svg");
        }
    });

    it("locale 元信息在位且合法(base 与每个精选案例,zh/en 双语、en 强制兜底)", () => {
        // 清单详情页经 package-meta 读 <pkg>/locale/<lang>.json 的 meta;en.json 是字典入口(缺了整组放弃)
        for (const caseId of listScenarioCases(target === "latest" ? LATEST_MANIFEST : NEXT_MANIFEST)) {
            for (const lang of ["zh", "en"]) {
                const meta = JSON.parse(
                    readFileSync(join(templatesRoot(target), "scenarios", caseId, "locale", `${lang}.json`), "utf8"),
                ) as { meta?: { title?: string; description?: string } };
                expect(meta.meta?.title, `${caseId} locale/${lang}.json meta.title`).toBeTruthy();
                expect(meta.meta?.description, `${caseId} locale/${lang}.json meta.description`).toBeTruthy();
            }
        }
        // base 模板(预设管线):双语 title 在位(description 回落 package.json,由用户自己写)
        for (const lang of ["zh", "en"]) {
            const meta = JSON.parse(
                readFileSync(join(templatesRoot(target), "locale", `${lang}.json`), "utf8"),
            ) as { meta?: { title?: string } };
            expect(meta.meta?.title, `base locale/${lang}.json meta.title`).toBeTruthy();
        }
    });
});
