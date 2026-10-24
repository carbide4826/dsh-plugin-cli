// golden set 守门:skills/dshp/references/examples.md 里的每个案例,规格必须能编译出文中写的那条命令。
//
// 为什么要有这条:examples.md 是给模型模仿的**参考例子**,模型会照着抄命令。
// 如果例子里的命令跟编译器(specToCliArgs)对不上 —— 比如规格改了命令没改、
// 或者手写命令时把参数顺序写错 —— 模型照抄就得到一个 CLI 拒收的组合,
// 用户看到的现象是「照着文档做,生成时又报错」。
// 所以每个案例都带一份可执行的规格(JSON),这里拿它真跑一遍编译器,再逐字比对。
//
// 另外:这批规格必须都是「收齐了」的(specGaps.ready),否则例子本身就在演示半成品流程。
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { specGaps, specSteps, specToCliArgs, specToCreateArgs, type Spec } from "./spec";

const EXAMPLES_MD = readFileSync(
    new URL("../../skills/dshp/references/examples.md", import.meta.url),
    "utf8",
);

/** 规格里允许出现的键(清单的规格键 + 连带键 + mode/skipped) */
const ALLOWED_KEYS = new Set<string>([
    "mode",
    "skipped",
    ...specSteps().flatMap((s) => [s.specKey, ...(s.alsoFills ?? [])]),
]);

/** 取第一个围栏代码块的内容(围栏类型匹配时) */
function firstFence(md: string, lang: string): string {
    const re = new RegExp("```" + lang + "\\n([\\s\\S]*?)```", "m");
    const m = re.exec(md);
    if (!m || m[1] === undefined) throw new Error(`找不到 ${lang} 代码块`);
    return m[1].trim();
}

/** 把命令行拆成参数(支持 "" / '' 引号) */
function tokenize(line: string): string[] {
    const out: string[] = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        out.push(m[1] ?? m[2] ?? m[3] ?? "");
    }
    return out;
}

/** 一个 golden 案例 */
interface GoldenCase {
    title: string;
    spec: Spec;
    command: string;
}

/** 解析 examples.md 里的所有「## 案例 N · …」小节 */
function parseCases(md: string): GoldenCase[] {
    const sections = md.split(/^## 案例 /m).slice(1);
    return sections.map((section) => {
        const title = section.split("\n")[0]?.trim() ?? "";
        const spec = JSON.parse(firstFence(section, "json")) as Spec;
        const command = firstFence(section, "sh");
        return { title, spec, command };
    });
}

const cases = parseCases(EXAMPLES_MD);

describe("golden set 的案例", () => {
    it("至少有 3 个案例(golden set 不能被删空)", () => {
        expect(cases.length).toBeGreaterThanOrEqual(3);
    });

    it.each(cases.map((c) => [c.title, c] as const))("%s:规格键都是清单认的键", (_title, c) => {
        for (const key of Object.keys(c.spec)) {
            expect(ALLOWED_KEYS.has(key), `规格里的键 ${key} 不是清单认的键`).toBe(true);
        }
    });

    it.each(cases.map((c) => [c.title, c] as const))("%s:规格已收齐(ready)", (_title, c) => {
        const gaps = specGaps(c.spec);
        expect(gaps.ready, `还没收齐,缺:${gaps.requiredPending.map((s) => s.id).join(",")}`).toBe(
            true,
        );
    });

    it.each(cases.map((c) => [c.title, c] as const))(
        "%s:文中命令 == 编译器产物",
        (_title, c) => {
            const tokens = tokenize(c.command);
            expect(tokens[0], "命令应以 dshp 开头").toBe("dshp");
            expect(tokens[1], "命令应是 dshp create").toBe("create");
            const written = tokens.slice(2);
            expect(written, "编译产物与文中命令不一致").toEqual(specToCliArgs(c.spec));
        },
    );

    it.each(cases.map((c) => [c.title, c] as const))(
        "%s:create 入参也能编译出来(MCP 侧同形)",
        (_title, c) => {
            const args = specToCreateArgs(c.spec);
            expect(args.mode, "create 入参没带上模式").toBeDefined();
        },
    );
});

describe("golden set 的取材", () => {
    it("覆盖模板路线与自配路线两条分支", () => {
        const routes = cases.map((c) => String(c.spec.route ?? ""));
        expect(routes).toContain("template");
        expect(routes).toContain("custom");
    });

    it("含一个「零原子」案例(编译器恒给 --atoms,空值也是非交互路径)", () => {
        const zero = cases.find((c) => Array.isArray(c.spec.atoms) && c.spec.atoms.length === 0);
        expect(zero, "golden set 里缺零原子案例").toBeDefined();
        const args = specToCliArgs(zero!.spec);
        expect(args).toContain("--atoms");
        expect(args[args.indexOf("--atoms") + 1]).toBe("");
    });

    it("提问形态段列了不止一种姿态(工具由应用自选)", () => {
        expect(EXAMPLES_MD).toContain("提问形态");
        expect(EXAMPLES_MD).toContain("形态 A");
        expect(EXAMPLES_MD).toContain("形态 B");
        expect(EXAMPLES_MD).toContain("形态 C");
    });
});
