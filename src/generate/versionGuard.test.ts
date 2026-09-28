// 版本单一来源守门:模板只用占位符、生成物版本与轨 manifest 一致、注入零残留、槽位键配对
// (规则背景见 docs/UPSTREAM-VERSION-POLICY.md;版本权威在 src/domain/manifests/)
import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    LATEST_MANIFEST,
    NEXT_MANIFEST,
    knownDshPackages,
    type TrackManifest,
} from "../domain/manifests";
import { copyScenarioCase } from "./scenarioCase";
import { templatesRoot } from "./project";
const casesRoot = (target: TrackManifest["target"]): string =>
    join(templatesRoot(target), "scenarios");

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
// 每轨的 manifest 集(结构化遍历用)
const TRACKS = [LATEST_MANIFEST, NEXT_MANIFEST];

describe.each(TRACKS.map((m) => [m] as const))("模板守门:版本只用占位符(%s 轨)", (manifest) => {
    const root = templatesRoot(manifest.target);

    it.each(
        walkFiles(casesRoot(manifest.target)).filter((f) => f.endsWith("package.json")),
    )("%s:配套依赖值必须是占位符", (file: string) => {
        const pkg = JSON.parse(
            readFileSync(join(casesRoot(manifest.target), file), "utf8"),
        ) as Record<string, Record<string, string>>;
        for (const bucket of ["dependencies", "peerDependencies", "devDependencies"]) {
            for (const [k, v] of Object.entries(pkg[bucket] ?? {})) {
                if (DSH_DEP_KEY.test(k)) {
                    expect(v, `${file} 的 ${k}`).toBe("__DSH_VERSION__");
                }
                if (k === "@deepseek-ai/cordis") {
                    expect(v, `${file} 的 ${k}`).toBe("__CORDIS_VERSION__");
                }
                if (k === "@deepseek-ai/schemastery") {
                    expect(v, `${file} 的 ${k}`).toBe("__SCHEMASTERY_VERSION__");
                }
            }
        }
    });

    it("案例 README 的 dsh 安装命令必须用占位符", () => {
        // 只查各案例目录内的 README(一层深);scenarios/README.md 是库索引说明,非生成素材
        for (const file of walkFiles(casesRoot(manifest.target)).filter((f) =>
            f.includes("/") && /^README(\.en)?\.md$/.test(f.split("/").pop() ?? ""))) {
            const text = readFileSync(join(casesRoot(manifest.target), file), "utf8");
            // README 安装命令 dsh@<version> 与行文里的版本字面量都不允许出现真实版本号
            expect(text, `${file} 含写死的 dsh 安装版本`).not.toMatch(
                /dsh@\d+\.\d+\.\d+/,
            );
            expect(text, `${file} 应包含占位符`).toContain("__DSH_VERSION__");
        }
    });

    it("settings-card 素材槽位键与 manifest 配对", () => {
        // 槽键是轨间唯一分叉素材面:latest=keyed 槽,next=list 页签槽,素材必须与所属轨一致
        const owners = [
            join(root, "atoms", "ui", "src", "client", "surfaces", "settings-card.ts"),
            join(root, "scenarios", "model-gateway", "src", "client", "surfaces", "settings-card.ts"),
        ];
        for (const file of owners) {
            const text = readFileSync(file, "utf8");
            expect(text, `${file} 应含本轨槽键`).toContain(manifest.settingsSlot);
        }
    });
});

describe("生成守门:版本注入与 manifest 一致", () => {
    it.each(TRACKS.map((m) => [m] as const))(
        "%s 轨:生成案例的依赖与安装命令全部等于 manifest,且无占位符残留",
        (manifest) => {
            const target = mkdtempSync(join(tmpdir(), "dshp-vguard-"));
            try {
                copyScenarioCase("quick-tool", target, "guard-demo", manifest);
                const pkg = JSON.parse(
                    readFileSync(join(target, "package.json"), "utf8"),
                ) as Record<string, Record<string, string>>;
                for (const bucket of ["dependencies", "peerDependencies", "devDependencies"]) {
                    for (const [k, v] of Object.entries(pkg[bucket] ?? {})) {
                        if (DSH_DEP_KEY.test(k)) {
                            expect(v, `${bucket}.${k}`).toBe(manifest.version);
                        }
                        if (k === "@deepseek-ai/cordis") {
                            expect(v, `${bucket}.${k}`).toBe(manifest.cordisPeer);
                        }
                        if (k === "@deepseek-ai/schemastery") {
                            expect(v, `${bucket}.${k}`).toBe(manifest.schemasteryVersion);
                        }
                    }
                }
                const readme = readFileSync(join(target, "README.md"), "utf8");
                expect(readme).toContain(`dsh@${manifest.version}`);

                // 全目录零占位符残留(注入管线漏一刀就会被逮到)
                for (const file of walkFiles(target)) {
                    const text = readFileSync(join(target, file), "utf8");
                    for (const ph of ["__DSH_VERSION__", "__CORDIS_VERSION__", "__SCHEMASTERY_VERSION__"]) {
                        expect(text, `${file} 残留占位符 ${ph}`).not.toContain(ph);
                    }
                }
            } finally {
                rmSync(target, { recursive: true, force: true });
            }
        },
    );
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

    it("双轨字段齐备且互不相同(树与 manifest 严格配对的语义前提)", () => {
        for (const m of TRACKS) {
            for (const field of [m.version, m.cordisPeer, m.schemasteryVersion, m.settingsSlot]) {
                expect(field, `${m.target} 有空字段`).toBeTruthy();
            }
        }
        expect(LATEST_MANIFEST.version).not.toBe(NEXT_MANIFEST.version);
        expect(LATEST_MANIFEST.settingsSlot).not.toBe(NEXT_MANIFEST.settingsSlot);
        // 轨名即容器名,永不随版本改名
        expect(LATEST_MANIFEST.target).toBe("latest");
        expect(NEXT_MANIFEST.target).toBe("next");
    });
});
