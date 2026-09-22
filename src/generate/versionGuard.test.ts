// 版本单一来源守门:模板只用占位符、生成物版本与 manifest 一致、注入零残留
// (规则背景见 docs/UPSTREAM-VERSION-POLICY.md;manifest 权威在 src/domain/dsh-manifest.ts)
import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DSH_MANIFEST, knownDshPackages } from "../domain/dsh-manifest";
import { copyScenarioCase } from "./scenarioCase";
import { templatesRoot } from "./project";

const casesRoot = (): string => join(templatesRoot(), "scenarios");

/** 递归收集目录下全部文件相对路径 */
function walkFiles(dir: string, prefix = ""): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = prefix ? `${prefix}/${entry}` : entry;
        if (statSync(full).isDirectory()) out.push(...walkFiles(full, rel));
        else out.push(rel);
    }
    return out;
}

const DSH_DEP_KEY = /^@deepseek-ai\/dsh-/;

describe("模板守门:版本只用占位符", () => {
    it.each(walkFiles(casesRoot()).filter((f) => f.endsWith("package.json")))(
        "%s:dsh 依赖值必须是占位符",
        (file: string) => {
            const pkg = JSON.parse(
                readFileSync(join(casesRoot(), file), "utf8"),
            ) as Record<string, Record<string, string>>;
            for (const bucket of ["dependencies", "peerDependencies", "devDependencies"]) {
                for (const [k, v] of Object.entries(pkg[bucket] ?? {})) {
                    if (DSH_DEP_KEY.test(k)) {
                        expect(v, `${file} 的 ${k}`).toBe("__DSH_VERSION__");
                    }
                }
            }
        },
    );

    it("案例 README 的 dsh 安装命令必须用占位符", () => {
        // 只查各案例目录内的 README(一层深);scenarios/README.md 是库索引说明,非生成素材
        for (const file of walkFiles(casesRoot()).filter((f) =>
            f.includes("/") && /^README(\.en)?\.md$/.test(f.split("/").pop() ?? ""))) {
            const text = readFileSync(join(casesRoot(), file), "utf8");
            // README 安装命令 dsh@<version> 与行文里的版本字面量都不允许出现真实版本号
            expect(text, `${file} 含写死的 dsh 安装版本`).not.toMatch(
                /dsh@\d+\.\d+\.\d+/,
            );
            expect(text, `${file} 应包含占位符`).toContain("__DSH_VERSION__");
        }
    });
});

describe("生成守门:版本注入与 manifest 一致", () => {
    it("生成案例的 dsh 依赖与安装命令全部等于 manifest.version,且无占位符残留", async () => {
        const { copyScenarioCase } = await import("./scenarioCase");
        const target = mkdtempSync(join(tmpdir(), "dshp-vguard-"));
        copyScenarioCase("quick-tool", target, "guard-demo");
        try {
            const pkg = JSON.parse(
                readFileSync(join(target, "package.json"), "utf8"),
            ) as Record<string, Record<string, string>>;
            for (const bucket of ["dependencies", "peerDependencies", "devDependencies"]) {
                for (const [k, v] of Object.entries(pkg[bucket] ?? {})) {
                    if (DSH_DEP_KEY.test(k)) {
                        expect(v, `${bucket}.${k}`).toBe(DSH_MANIFEST.version);
                    }
                }
            }
            const readme = readFileSync(join(target, "README.md"), "utf8");
            expect(readme).toContain(`dsh@${DSH_MANIFEST.version}`);

            // 全目录零占位符残留(注入管线漏一刀就会被逮到)
            for (const file of walkFiles(target)) {
                const text = readFileSync(join(target, file), "utf8");
                expect(text, `${file} 残留占位符`).not.toContain("__DSH_VERSION__");
            }
        } finally {
            rmSync(target, { recursive: true, force: true });
        }
    });
});

describe("manifest 自身健康度", () => {
    it("knownDshPackages 非空、去重、排序、全为 dsh 前缀,且覆盖代表性子包", () => {
        expect(knownDshPackages.length).toBeGreaterThan(20);
        for (const p of knownDshPackages) expect(p.startsWith("@deepseek-ai/dsh-")).toBe(true);
        expect(new Set(knownDshPackages).size).toBe(knownDshPackages.length); // 去重
        expect([...knownDshPackages].sort()).toEqual([...knownDshPackages]); // 排序
        // 抽查:五个能力面的代表包都在清单里(某域清单改名/被删,这条红)
        for (const must of [
            "@deepseek-ai/dsh-tools",
            "@deepseek-ai/dsh-client-ui-slots",
            "@deepseek-ai/dsh-llm",
            "@deepseek-ai/dsh-session",
            "@deepseek-ai/dsh-storage",
        ]) {
            expect(knownDshPackages).toContain(must);
        }
    });
});
