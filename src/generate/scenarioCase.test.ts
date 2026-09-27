// 精选案例(金样)结构校验:案例库是人工维护的完整工程,
// 用结构断言防退化——必需文件齐、身份字段对、无占位符残留、拷贝重写正确。
// 注意:这是结构校验而非逐字 diff(案例允许比管线产物更丰富)。
import { describe, expect, it } from "vitest";
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyScenarioCase, listScenarioCases } from "./scenarioCase";
import { templatesRoot } from "./project";
import {
    LATEST_MANIFEST,
    NEXT_MANIFEST,
    TRACK_TARGETS,
    type TrackTarget,
} from "../domain/manifests";

const casesRoot = (target: TrackTarget) => join(templatesRoot(target), "scenarios");
const manifestOf = (target: TrackTarget) => (target === "latest" ? LATEST_MANIFEST : NEXT_MANIFEST);

/** 递归收集目录下全部文件(相对路径) */
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

describe("精选案例库结构", () => {
    it("案例清单与设计目录一致", () => {
        expect(listScenarioCases(LATEST_MANIFEST)).toEqual([
            "model-gateway",
            "notebook",
            "quick-tool",
            "session-bot",
            "webhook-bridge",
        ]);
        // 双轨案例集必须一致(树分叉只发生在槽位迁移素材,不在案例构成)
        expect(listScenarioCases(NEXT_MANIFEST)).toEqual(listScenarioCases(LATEST_MANIFEST));
    });

    it.each(
        TRACK_TARGETS.flatMap((target) =>
            listScenarioCases(manifestOf(target)).map((caseId) => [target, caseId] as const),
        ),
    )("%s 轨:案例 %s 必需文件齐全、身份字段正确、无占位符残留", (target, caseId) => {
            const dir = join(casesRoot(target), caseId);

            // 必需文件:完整工程的最小集合
            for (const required of [
                "package.json",
                "README.md",
                "tsconfig.json",
                "tsdown.config.ts",
                "cordis.patch.yml",
                "_gitignore",
                join("src", "index.ts"),
            ]) {
                expect(
                    existsSync(join(dir, required)),
                    `${caseId}/${required}`,
                ).toBe(true);
            }
            expect(
                existsSync(join(dir, "dev.patch.yml")),
                `${caseId}/dev.patch.yml 不应入库`,
            ).toBe(false);
            expect(
                existsSync(join(dir, "node_modules")),
                `${caseId}/node_modules`,
            ).toBe(false);
            expect(existsSync(join(dir, "dist")), `${caseId}/dist`).toBe(false);

            // 身份字段:包名 / 插件 name 导出 / patch id 三处一致
            const pkg = JSON.parse(
                readFileSync(join(dir, "package.json"), "utf8"),
            ) as {
                name?: string;
                exports?: Record<string, unknown>;
            };
            expect(pkg.name, `${caseId} package.json name`).toBe(caseId);
            expect(pkg.exports?.["."], `${caseId} exports "."`).toBeDefined();
            const indexTs = readFileSync(join(dir, "src", "index.ts"), "utf8");
            expect(indexTs).toContain(`'${caseId}'`); // name 导出
            expect(
                readFileSync(join(dir, "cordis.patch.yml"), "utf8"),
            ).toContain(`id: ${caseId}`);

            // 无占位符残留(案例是成品,不是模板);只查 {{NAME}} 形态,避开 JSX 的 style={{…}}
            const placeholder = /\{\{\s*[A-Z][A-Z0-9_]*\s*\}\}/;
            for (const file of walk(dir)) {
                const text = readFileSync(join(dir, file), "utf8");
                expect(
                    placeholder.test(text),
                    `${caseId}/${file} 残留占位符`,
                ).toBe(false);
            }
        },
    );
});

describe("copyScenarioCase 拷贝与身份重写", () => {
    it("整目录拷贝且案例 id 全部重写为项目名", () => {
        const caseId = "quick-tool";
        const pkgName = "my-tool-demo";
        const target = mkdtempSync(join(tmpdir(), "dshp-case-"));
        try {
            const files = copyScenarioCase(caseId, target, pkgName, LATEST_MANIFEST);
            // 点文件素材按 `_`→`.` 落成:源文件集经同一规则映射后应与产物集一文不落;
            // dev.patch.yml 不随案例入库,由 CLI 现场生成,故在映射集之外多一份
            const toDest = (p: string) =>
                p
                    .split("/")
                    .map((seg) =>
                        seg.startsWith("_") ? "." + seg.slice(1) : seg,
                    )
                    .join("/");
            const sourceFiles = walk(join(casesRoot("latest"), caseId))
                .map((f) => toDest(f.replaceAll("\\", "/")))
                // README 双语素材:生成时按语言只交付一份(zh 环境删 README.en.md),产物集不含未选中那份
                .filter((f) => f !== "README.en.md")
                .sort();
            expect(files).toEqual([...sourceFiles, "dev.patch.yml", "pnpm-workspace.yaml"].sort());
            expect(files).toContain(".gitignore"); // 素材 `_gitignore` 落成标准点文件名

            // 身份三处 + 全库无旧 id 残留
            const pkg = JSON.parse(
                readFileSync(join(target, "package.json"), "utf8"),
            ) as { name?: string };
            expect(pkg.name).toBe(pkgName);
            expect(
                readFileSync(join(target, "src", "index.ts"), "utf8"),
            ).toContain(`'${pkgName}'`);
            expect(
                readFileSync(join(target, "cordis.patch.yml"), "utf8"),
            ).toContain(`id: ${pkgName}`);
            for (const file of files) {
                const text = readFileSync(join(target, file), "utf8");
                expect(text.includes(caseId), `${file} 仍残留旧案例 id`).toBe(
                    false,
                );
            }

            // 现场生成的 dev.patch.yml:id 随身份重写、name 指向源码入口绝对路径、config 块保留
            const devPatch = readFileSync(
                join(target, "dev.patch.yml"),
                "utf8",
            );
            expect(devPatch).toContain(`id: ${pkgName}`);
            expect(devPatch).toContain(
                `name: '${join(target, "src", "index.ts")}'`,
            );
            expect(devPatch).not.toContain("分发配置层"); // 头部说明换成 overlay 语境
        } finally {
            rmSync(target, { recursive: true, force: true });
        }
    });

    it("同名拷贝不做替换,不存在的案例抛错", () => {
        const target = mkdtempSync(join(tmpdir(), "dshp-case-"));
        try {
            const files = copyScenarioCase("notebook", target, "notebook", LATEST_MANIFEST);
            expect(files.length).toBeGreaterThan(0);
            expect(
                readFileSync(join(target, "package.json"), "utf8"),
            ).toContain('"notebook"');
            expect(() =>
                copyScenarioCase("nope", target, "nope", LATEST_MANIFEST),
            ).toThrow("nope");
        } finally {
            rmSync(target, { recursive: true, force: true });
        }
    });

    it("dev.patch.yml 原样保留案例 config 块(model-gateway)", () => {
        const target = mkdtempSync(join(tmpdir(), "dshp-case-"));
        try {
            copyScenarioCase("model-gateway", target, "gw-demo", LATEST_MANIFEST);
            const devPatch = readFileSync(
                join(target, "dev.patch.yml"),
                "utf8",
            );
            expect(devPatch).toContain("id: gw-demo");
            expect(devPatch).toContain("config:");
            expect(devPatch).toContain(
                "baseUrl: 'https://gateway.example.com/v1'",
            );
            expect(devPatch).toContain("model: 'gateway-chat'");
        } finally {
            rmSync(target, { recursive: true, force: true });
        }
    });

    it("双轨版本注入:同一案例按轨渲染出各自的配套版本", () => {
        const latest = mkdtempSync(join(tmpdir(), "dshp-case-lt-"));
        const next = mkdtempSync(join(tmpdir(), "dshp-case-nx-"));
        try {
            copyScenarioCase("quick-tool", latest, "dual-demo", LATEST_MANIFEST);
            copyScenarioCase("quick-tool", next, "dual-demo", NEXT_MANIFEST);
            const readPkg = (dir: string) =>
                JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
                    peerDependencies?: Record<string, string>;
                    dependencies?: Record<string, string>;
                };
            const lt = readPkg(latest);
            const nx = readPkg(next);
            expect(lt.peerDependencies?.["@deepseek-ai/dsh-tools"]).toBe(LATEST_MANIFEST.version);
            expect(lt.peerDependencies?.["@deepseek-ai/cordis"]).toBe(LATEST_MANIFEST.cordisPeer);
            expect(nx.peerDependencies?.["@deepseek-ai/dsh-tools"]).toBe(NEXT_MANIFEST.version);
            expect(nx.peerDependencies?.["@deepseek-ai/cordis"]).toBe(NEXT_MANIFEST.cordisPeer);
            if (nx.dependencies?.["@deepseek-ai/schemastery"]) {
                expect(nx.dependencies["@deepseek-ai/schemastery"]).toBe(NEXT_MANIFEST.schemasteryVersion);
            }
            // 两轨产物必须不同(渲染确实消费了轨 manifest,不是同一份拷贝)
            expect(nx.peerDependencies?.["@deepseek-ai/dsh-tools"]).not.toBe(
                lt.peerDependencies?.["@deepseek-ai/dsh-tools"],
            );
        } finally {
            rmSync(latest, { recursive: true, force: true });
            rmSync(next, { recursive: true, force: true });
        }
    });
});
