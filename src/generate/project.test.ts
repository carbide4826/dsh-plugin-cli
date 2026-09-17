// 【M2-c】生成器单测:package.json / patch / 入口 / 编排落盘
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Answers } from "../domain/types";
import { collectDeps } from "../domain/deps";
import { generatePackageJson } from "./packageJson";
import { generateCordisPatch, generateDevPatch } from "./patches";
import { generateHostIndex } from "./indexTs";
import { writeProject } from "./project";

const base: Answers = {
    dirName: "demo",
    pkgName: "demo",
    pluginId: "demo",
    toolName: "demo_tool",
    description: "demo plugin",
    author: "carbide4826",
    pkgPosition: "bundle",
    atoms: [],
    eventDomains: [],
    uiSurfaces: [],
    serviceCreate: false,
    serviceSeams: [],
    config: "none",
};

const tmpDirs: string[] = [];
afterEach(() => {
    for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function freshDir(): string {
    const d = mkdtempSync(join(tmpdir(), "dshp-gen-"));
    tmpDirs.push(d);
    return d;
}

describe("generatePackageJson", () => {
    it("bundle 声明存在,库包没有;依赖按桶落位且 dsh 包精确钉版本", () => {
        const answers: Answers = { ...base, atoms: ["tool"] };
        const deps = collectDeps(answers);
        const pkg = JSON.parse(generatePackageJson(answers, deps));
        expect(pkg.dsh.bundle.patch).toBe("./cordis.patch.yml");
        expect(pkg.exports["./cordis.patch.yml"]).toBe("./cordis.patch.yml");
        expect(pkg.peerDependencies["@deepseek-ai/dsh-tools"]).toBe("0.1.5-rc.2");
        expect(pkg.peerDependencies["@deepseek-ai/cordis"]).toBe("^4.0.2");

        const lib = JSON.parse(generatePackageJson({ ...base, pkgPosition: "library" }, collectDeps({ ...base, pkgPosition: "library" })));
        expect(lib.dsh).toBeUndefined();
        expect(lib.exports["./cordis.patch.yml"]).toBeUndefined();
    });

    it("勾 UI:exports 双出口 + dsh.client 注入 renderer/slots 与 Owner 包", () => {
        const answers: Answers = { ...base, atoms: ["ui"], uiSurfaces: ["settings-card"] };
        const pkg = JSON.parse(generatePackageJson(answers, collectDeps(answers)));
        expect(pkg.exports["./client"]).toBe("./dist/client.js");
        expect(pkg.dsh.client.platform).toBe("web");
        expect(pkg.dsh.client.inject).toContain("@deepseek-ai/dsh-client-ui-renderer");
        // slots 服务来源必须注入,否则 client 半边 ctx.slots 为 undefined
        expect(pkg.dsh.client.inject).toContain("@deepseek-ai/dsh-client-ui-slots");
        expect(pkg.dsh.client.inject).toContain("@deepseek-ai/dsh-client-ui-settings-plugins");
        expect(pkg.devDependencies["react"]).toBe("^18.2.0");
    });
});

describe("patches", () => {
    it("none 无 config;static 带 config;dev.patch 的 name 是绝对路径", () => {
        expect(generateCordisPatch(base)).not.toContain("config:");
        const withCfg = generateCordisPatch({ ...base, config: "static" });
        expect(withCfg).toContain("config:");
        expect(withCfg).toContain("example: 'TODO-按需修改'");
        const dev = generateDevPatch({ ...base, config: "static" }, "/tmp/demo/src/index.ts");
        expect(dev).toContain("name: '/tmp/demo/src/index.ts'");
    });
});

describe("generateHostIndex", () => {
    it("none:无 Config,apply 单参;static:双参 + Config 声明", () => {
        const none = generateHostIndex(base, { injects: [], imports: [], calls: [] });
        expect(none).toContain("export function apply(ctx: Context): void {");
        expect(none).not.toContain("schemastery");

        const stat = generateHostIndex({ ...base, config: "static" }, { injects: [], imports: [], calls: [] });
        expect(stat).toContain("import z from '@deepseek-ai/schemastery'");
        expect(stat).toContain("export function apply(ctx: Context, config: Config): void {");
    });

    it("dynamic:inject 并入 settings + installSection 接线", () => {
        const dyn = generateHostIndex(
            { ...base, config: "dynamic" },
            { injects: ["tools"], imports: [], calls: ["registerTool(ctx)"] },
        );
        expect(dyn).toContain("export const inject = ['tools', 'settings']");
        expect(dyn).toContain("ctx.settings.installSection(ctx, 'demo', Config, config, {");
    });
});

describe("writeProject", () => {
    it("组合生成:文件树完整,patch 按定位出现,index 拼装正确", () => {
        const dir = freshDir();
        const answers: Answers = {
            ...base,
            atoms: ["tool", "events", "service", "protocol"],
            eventDomains: ["tools"],
            serviceCreate: true,
            serviceSeams: ["llm"],
            config: "static",
        };
        const files = writeProject(answers, dir);

        // base + 拷贝 + 动态文件都落了盘
        for (const f of [
            "tsconfig.json", "tsdown.config.ts", "README.md", ".gitignore", "package.json",
            "cordis.patch.yml", "dev.patch.yml", "src/index.ts",
            "src/tool.ts", "src/events.ts", "src/domains/tools.ts",
            "src/service.ts", "src/seams/index.ts", "src/seams/llm.ts", "src/protocol.ts",
        ]) {
            expect(existsSync(join(dir, f)), f).toBe(true);
        }
        expect(files).toContain("src/tool.ts");

        // tsdown 配置就近优先(非 UI 单入口),防祖先目录配置劫持;扩展名钉 .js 与 exports 对齐
        const tsdownCfg = readFileSync(join(dir, "tsdown.config.ts"), "utf8");
        expect(tsdownCfg).toContain("entry: ['src/index.ts']");
        expect(tsdownCfg).toContain("outExtensions");

        // 非 UI 项目:UI 专属物不得泄漏(无 CSS 内联段、无 @tsdown/css)
        expect(tsdownCfg).not.toContain("dshp-inline-client-css");
        expect(tsdownCfg).not.toContain("style.css");
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
        expect(pkg.devDependencies["@tsdown/css"]).toBeUndefined();

        expect(pkg.exports["."]).toBe("./dist/index.js");

        // 入口拼装:name/inject/Config/apply 双参
        const index = readFileSync(join(dir, "src/index.ts"), "utf8");
        expect(index).toContain("export const name = 'demo'");
        expect(index).toContain("export const inject = ['tools', 'llm', 'agents']");
        expect(index).toContain("export function apply(ctx: Context, config: Config): void {");
        expect(index).toContain("registerServiceSeams(ctx)");

        // 未勾选域不落盘
        expect(existsSync(join(dir, "src/domains/agent.ts"))).toBe(false);

        // README 的 EXTRA_STRUCTURE 已替换
        const readme = readFileSync(join(dir, "README.md"), "utf8");
        expect(readme).not.toContain("{{EXTRA_STRUCTURE}}");
        expect(readme).toContain("src/tool.ts");
    });

    it("库包定位:不生成 cordis.patch.yml,dev.patch 仍生成", () => {
        const dir = freshDir();
        writeProject({ ...base, pkgPosition: "library" }, dir);
        expect(existsSync(join(dir, "cordis.patch.yml"))).toBe(false);
        expect(existsSync(join(dir, "dev.patch.yml"))).toBe(true);
    });

    it("勾 UI:界面位按注册层 .ts + 组件 .tsx + 样式 .module.css 三件套落盘", () => {
        const dir = freshDir();
        writeProject({ ...base, atoms: ["ui"], uiSurfaces: ["sidebar"] }, dir);
        expect(existsSync(join(dir, "src/client/surfaces/sidebar-panel.ts"))).toBe(true);
        expect(existsSync(join(dir, "src/client/surfaces/SidebarPanel.tsx"))).toBe(true);
        expect(existsSync(join(dir, "src/client/surfaces/SidebarPanel.module.css"))).toBe(true);
        expect(existsSync(join(dir, "src/client/index.ts"))).toBe(true);
        // CSS Modules 的 TS 契约随 UI 生成
        expect(existsSync(join(dir, "src/css-modules.d.ts"))).toBe(true);

        // client 出口必须是 __ModuleLoader__ 注册式 CJS 段(聚合 bundle 非 ESM 上下文)
        const tsdownCfg = readFileSync(join(dir, "tsdown.config.ts"), "utf8");
        expect(tsdownCfg).toContain("__ModuleLoader__");
        expect(tsdownCfg).toContain("format: 'cjs'");
        expect(tsdownCfg).toContain("{ index: 'src/index.ts' }");
        // CSS 内联插件在场,注入标签锚定到本项目包名
        expect(tsdownCfg).toContain("dshp-inline-client-css");
        expect(tsdownCfg).toContain('style[data-plugin-css="demo"]');
        // 渲染完整性:注释里误写字面占位符会被引擎当真替换,产物不得残留任何 {{...}}
        expect(tsdownCfg).not.toContain("{{");

        // UI 专属工具链:@tsdown/css 进 devDeps(tsdown 的 CSS 管线,缺位即构建报错)
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
        expect(pkg.devDependencies["@tsdown/css"]).toBe("^0.23.0");
    });

    // 手工工具:DSH_GEN_E2E_DIR 指向装好全部 host 依赖的检查工程时,生成宿主组合供真实 tsc。
    // 用法:DSH_GEN_E2E_DIR=/tmp/dshp-template-check npx vitest run src/generate/project.test.ts
    it("e2e 工具:生成 host 组合(不勾 UI,client 依赖本地装不齐)", () => {
        const dir = process.env["DSH_GEN_E2E_DIR"];
        if (dir === undefined) return;
        const dynamic = process.env["DSH_GEN_E2E_DYNAMIC"] === "1";
        const files = writeProject(
            {
                ...base,
                dirName: dir,
                atoms: ["tool", "events", "service", "protocol"],
                eventDomains: ["tools", "agent"],
                serviceCreate: true,
                serviceSeams: ["llm"],
                config: dynamic ? "dynamic" : "static",
            },
            dir,
        );
        console.log(`[e2e] generated ${files.length} files (${dynamic ? "dynamic" : "static"}) -> ${dir}`);
    });
});
