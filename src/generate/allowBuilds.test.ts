// 构建脚本放行清单(allowBuilds)守门:
// 生成项目自带一份按官方 dsh 口径预置的清单 —— 要真跑的填 true、no-op 包显式拒绝(false)。
// 少了它:用到 llm 能力的项目在 pnpm 11 严格模式下 install 直接失败
//   (ERR_PNPM_IGNORED_BUILDS,实测 exit=1;列出后 exit=0);
// 填错:把 no-op 包也放行就偏离官方口径(官方明确 deny,理由是
//   "no-ops we don't need, so we deny them — install still succeeds")。
// 清单是单源素材(templates/<轨>/pnpm-workspace.yaml),预设管线与精选案例管线共用,不许各抄一份。
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Answers } from "../domain/types";
import { LATEST_MANIFEST, NEXT_MANIFEST } from "../domain/manifests";
import { templatesRoot, writeProject } from "./project";
import { copyScenarioCase } from "./scenarioCase";

/** 要真跑的:原生模块编译 / 装 spawn helper */
const MUST_RUN = ["node-pty", "koffi", "@deepseek-ai/dsh-subprocess-local"];
/** no-op 的:官方 dsh 显式拒绝执行,install 照样成功 */
const NO_OP = ["@google/genai", "protobufjs"];

/** 解析素材里的 allowBuilds 段(手写 YAML,只取顶层标量,不引三方解析器) */
function parseAllowBuilds(text: string): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    let inSection = false;
    for (const raw of text.split("\n")) {
        if (/^allowBuilds:\s*$/.test(raw)) {
            inSection = true;
            continue;
        }
        if (!inSection) continue;
        const trimmed = raw.trim();
        if (trimmed === "" || trimmed.startsWith("#")) continue;
        if (!/^\s/.test(raw)) break; // allowBuilds 段结束
        const m = raw.match(/^\s+(?:'([^']+)'|([^\s:]+)):\s*(true|false)\s*$/);
        const key = m?.[1] ?? m?.[2];
        if (key) out[key] = m?.[3] === "true";
    }
    return out;
}

const tmpDirs: string[] = [];
afterEach(() => {
    for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function freshDir(): string {
    const d = mkdtempSync(join(tmpdir(), "dshp-ab-"));
    tmpDirs.push(d);
    return d;
}

const answers: Answers = {
    dirName: "demo",
    pkgName: "demo",
    pluginId: "demo",
    toolName: "demo_tool",
    description: "demo plugin",
    author: "carbide4826",
    pkgPosition: "bundle",
    atoms: ["tool"],
    eventDomains: [],
    uiSurfaces: [],
    serviceCreate: false,
    serviceSeams: [],
    config: "none",
};

describe("allowBuilds 清单(生成物自带,官方 dsh 口径)", () => {
    for (const manifest of [LATEST_MANIFEST, NEXT_MANIFEST]) {
        it(`${manifest.target} 轨素材:要真跑的填 true、no-op 填 false,且无多余条目`, () => {
            const text = readFileSync(
                join(templatesRoot(manifest.target), "pnpm-workspace.yaml"),
                "utf8",
            );
            const map = parseAllowBuilds(text);
            for (const name of MUST_RUN) expect(map[name], name).toBe(true);
            for (const name of NO_OP) expect(map[name], name).toBe(false);
            // 多余条目虽被 pnpm 接受,但清单要贴着实际依赖树,别堆闲条目
            expect(Object.keys(map).sort()).toEqual([...MUST_RUN, ...NO_OP].sort());
        });

        it(`${manifest.target} 轨预设管线:产物里的清单与素材逐字一致`, () => {
            const dir = freshDir();
            writeProject(answers, dir, manifest);
            const produced = readFileSync(join(dir, "pnpm-workspace.yaml"), "utf8");
            const source = readFileSync(
                join(templatesRoot(manifest.target), "pnpm-workspace.yaml"),
                "utf8",
            );
            expect(produced).toBe(source);
        });

        it(`${manifest.target} 轨精选案例管线:产物里的清单与素材逐字一致`, () => {
            const dir = freshDir();
            copyScenarioCase("quick-tool", dir, "quick-tool", manifest);
            const produced = readFileSync(join(dir, "pnpm-workspace.yaml"), "utf8");
            const source = readFileSync(
                join(templatesRoot(manifest.target), "pnpm-workspace.yaml"),
                "utf8",
            );
            expect(produced).toBe(source);
        });
    }
});
