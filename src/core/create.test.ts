// 统一生成入口守门:解析 / 计划 / 落盘三段的契约。
// 重点盯两件事:
// - 计划态真的不落盘(否则 MCP 的「先看清再写」就是假的)
// - 目录名/身份的默认值只在规则层有一份(CLI 与 MCP 共用,两边不能各推一遍)
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    createFromSpec,
    nextSteps,
    planCreate,
    resolveCreate,
    writeCreate,
} from "./create";
import { DshpError } from "./errors";
import { NEXT_MANIFEST } from "../domain/manifests";

/** 断言抛出的 DshpError 带指定 code */
function expectCode(fn: () => unknown, code: string): void {
    try {
        fn();
    } catch (err) {
        expect(err, `期望抛 DshpError(${code}),实际:${String(err)}`).toBeInstanceOf(DshpError);
        expect((err as DshpError).code).toBe(code);
        return;
    }
    throw new Error(`期望抛出 ${code},但没有抛错`);
}

const tmpDirs: string[] = [];
afterEach(() => {
    for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function freshDir(): string {
    const d = mkdtempSync(join(tmpdir(), "dshp-create-"));
    tmpDirs.push(d);
    return d;
}

describe("resolveCreate", () => {
    it("preset 模式:目录名缺省取预设默认名", () => {
        const r = resolveCreate({ mode: "preset", preset: "tool" });
        expect(r.dirName).toBe("my-tool");
        expect(r.manifest.target).toBe("latest"); // 缺省轨 = latest
        expect(r.answers?.atoms).toEqual(["tool"]);
    });

    it("case 模式:目录名缺省取案例 id,身份缺省取目录名", () => {
        const r = resolveCreate({ mode: "case", case: "quick-tool" });
        expect(r.dirName).toBe("quick-tool");
        expect(r.caseId).toBe("quick-tool");
        expect(r.identity).toBe("quick-tool");
        expect(r.answers).toBeUndefined(); // 案例是整目录拷贝,没有问卷
    });

    it("free 模式:目录名缺省 my-plugin", () => {
        const r = resolveCreate({ mode: "free", atoms: ["tool"] });
        expect(r.dirName).toBe("my-plugin");
        expect(r.answers?.pkgName).toBe("my-plugin");
        expect(r.answers?.pluginId).toBe("my-plugin");
    });

    it("非法轨名报错,不静默回落 latest", () => {
        expectCode(() => resolveCreate({ mode: "free", target: "bogus" }), "UNKNOWN_TARGET");
    });

    it("未知预设 / 未知案例各报各的码", () => {
        expectCode(() => resolveCreate({ mode: "preset", preset: "nope" }), "UNKNOWN_SCENARIO");
        expectCode(() => resolveCreate({ mode: "case", case: "nope" }), "CASE_NOT_FOUND");
    });

    it("目录已存在 = 失败态(半覆盖比报错更糟)", () => {
        const base = freshDir();
        mkdirSync(join(base, "taken"), { recursive: true });
        expectCode(
            () => resolveCreate({ mode: "free", dirName: "taken", atoms: ["tool"] }, base),
            "DIR_EXISTS",
        );
    });

    it("自由组合的硬约束在解析层就拦(界面位缺依赖原子)", () => {
        expectCode(
            () =>
                resolveCreate({
                    mode: "free",
                    atoms: [],
                    uiSurfaces: ["settings-card"],
                    config: "dynamic",
                }),
            "SURFACE_REQUIRES_ATOM",
        );
    });
});

describe("planCreate / writeCreate", () => {
    it("计划态不落盘(目录都不建)", () => {
        const base = freshDir();
        const resolved = resolveCreate({ mode: "free", dirName: "p1", atoms: ["tool"] }, base);
        const files = planCreate(resolved);
        expect(files.length).toBeGreaterThan(0);
        expect(files).toContain("package.json");
        expect(existsSync(join(base, "p1"))).toBe(false); // 一个文件都没写
    });

    it("落盘态写出文件,清单与计划一致", () => {
        const base = freshDir();
        const resolved = resolveCreate({ mode: "free", dirName: "w1", atoms: ["tool"] }, base);
        const planned = planCreate(resolved);
        const written = writeCreate(resolved);
        expect(written.sort()).toEqual(planned.sort());
        expect(existsSync(join(base, "w1", "package.json"))).toBe(true);
    });

    it("案例计划态的文件清单与落盘态一致(计划态不能骗人)", () => {
        const base = freshDir();
        const resolved = resolveCreate({ mode: "case", case: "quick-tool", dirName: "c1" }, base);
        const planned = planCreate(resolved);
        const written = writeCreate(resolved);
        expect(written.sort()).toEqual(planned.sort());
        expect(planned).toContain("dev.patch.yml");
        expect(planned).toContain("pnpm-workspace.yaml");
    });
});

describe("createFromSpec", () => {
    it("计划态返回清单与后续命令,不写盘", () => {
        const base = freshDir();
        const r = createFromSpec({ mode: "free", dirName: "x1", atoms: ["tool"] }, false, base);
        expect(r.written).toBe(false);
        expect(r.mode).toBe("free");
        expect(r.files.length).toBeGreaterThan(0);
        expect(r.nextSteps[0]).toBe("cd x1");
        expect(existsSync(join(base, "x1"))).toBe(false);
    });

    it("落盘态写盘并返回清单", () => {
        const base = freshDir();
        const r = createFromSpec({ mode: "free", dirName: "x2", atoms: ["tool"] }, true, base);
        expect(r.written).toBe(true);
        expect(existsSync(join(base, "x2", "package.json"))).toBe(true);
    });

    it("案例模式不返回问卷答案(case 没有问卷)", () => {
        const base = freshDir();
        const r = createFromSpec({ mode: "case", case: "quick-tool", dirName: "x3" }, false, base);
        expect(r.answers).toBeUndefined();
        expect(r.mode).toBe("case");
    });

    it("落盘的 package.json 里带上了轨的 dsh 版本(版本单源)", () => {
        const base = freshDir();
        createFromSpec(
            { mode: "free", dirName: "x4", atoms: ["tool"], target: "next" },
            true,
            base,
        );
        const pkg = JSON.parse(
            readFileSync(join(base, "x4", "package.json"), "utf8"),
        ) as { peerDependencies: Record<string, string> };
        // 版本事实源只有 manifest 一处:这里取 manifest,不再抄一份字面量
        // (抄字面量 = 第二个事实源,每次升版都要人肉改,且会漏改)
        expect(Object.values(pkg.peerDependencies)).toContain(NEXT_MANIFEST.version);
    });
});

describe("nextSteps", () => {
    it("生成后的标准命令固定五条(CLI 与 MCP 共用一份)", () => {
        expect(nextSteps("demo")).toEqual([
            "cd demo",
            "pnpm install",
            "pnpm typecheck",
            "pnpm build",
            "pnpm dsh web --patch ./dev.patch.yml",
        ]);
    });
});
