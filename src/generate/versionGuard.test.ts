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

/**
 * 比较两个 semver(含预发布段),a 低于 b 返回负数、同版返回 0、高于返回正数。
 * 规则按官方优先级:先比主/次/补丁三段数值,再比预发布段(有预发布者低于无预发布者,
 * 标识符逐段比、纯数字段按数值)。只服务本文件的轨序守门,不追求完整实现规范。
 * @param a - 版本串 A,如 0.2.0-rc.2
 * @param b - 版本串 B,如 0.2.0
 * @returns A 与 B 的相对大小
 */
function semverCompare(a: string, b: string): number {
    const parse = (v: string) => {
        const dash = v.indexOf("-");
        const core = (dash < 0 ? v : v.slice(0, dash)).split(".").map(Number);
        const pre =
            dash < 0
                ? []
                : v
                      .slice(dash + 1)
                      .split(".")
                      .map((id) => (/^\d+$/.test(id) ? Number(id) : id));
        return { core, pre };
    };
    const x = parse(a);
    const y = parse(b);
    for (let i = 0; i < 3; i++) {
        const diff = (x.core[i] ?? 0) - (y.core[i] ?? 0);
        if (diff !== 0) return diff;
    }
    if (x.pre.length === 0) return y.pre.length === 0 ? 0 : 1;
    if (y.pre.length === 0) return -1;
    for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
        const p = x.pre[i];
        const q = y.pre[i];
        if (p === undefined) return -1;
        if (q === undefined) return 1;
        if (p === q) continue;
        if (typeof p === "number" && typeof q === "number") return p - q;
        return String(p) < String(q) ? -1 : 1;
    }
    return 0;
}

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
        // 槽键 2026-09-30 晋升后两轨同形(Plugins 页签槽),素材必须与所属轨 manifest 一致
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

    it("双轨字段齐备且 next 轨不落后于 latest 轨(晋升只单向前移)", () => {
        for (const m of TRACKS) {
            for (const field of [m.version, m.cordisPeer, m.schemasteryVersion, m.settingsSlot]) {
                expect(field, `${m.target} 有空字段`).toBeTruthy();
            }
        }
        // 槽键不断言互异:自 0.1.7 晋升起两轨同形,轨间分叉落在各树内容与 manifest 配对上
        expect(LATEST_MANIFEST.target).toBe("latest");
        expect(NEXT_MANIFEST.target).toBe("next");
        // 版本不变式取「next ≥ latest」而非「next ≠ latest」:晋升协议里 latest 追平 next 是
        // 合法瞬时态(官方 dist-tags 双 0.2.0-rc.2 即此态),写死互异会在每次追平后被迫拆逻辑;
        // 反过来「latest 跑到 next 前面」只可能是晋升方向写错或某轨漏更,这条才是常驻风险
        expect(
            semverCompare(LATEST_MANIFEST.version, NEXT_MANIFEST.version) <= 0,
            `轨序倒置:latest=${LATEST_MANIFEST.version} 高于 next=${NEXT_MANIFEST.version}(约束是 latest ≤ next)`,
        ).toBe(true);
    });

    it("semverCompare 自身可用(守门判据的前提)", () => {
        expect(semverCompare("0.2.0-rc.2", "0.2.0-rc.3")).toBeLessThan(0); // 同为 rc 线比尾号
        expect(semverCompare("0.2.0-rc.2", "0.2.0")).toBeLessThan(0); // 预发布低于正式版
        expect(semverCompare("0.2.0-rc.2", "0.2.0-rc.2")).toBe(0); // 同版=合法瞬时态
        expect(semverCompare("0.2.0", "0.1.9-rc.9")).toBeGreaterThan(0); // 主版本线优先于预发布
    });
});
