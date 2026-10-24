// skill 快照守门:skills/dshp/references/interview.md 的步骤清单必须与 src/core/spec.ts 一致。
//
// 为什么要有这条:访谈清单有三条出口(CLI `dshp spec` / MCP `dshp_spec` / skill 的
// reference 快照),前两条是代码生成的,第三条是手写的 —— 改了 spec.ts 忘了同步
// reference,agent 拿到的就是过期清单:照着填一个已经不存在的步骤 id,用户看到的是
// 「问了半天,生成时又报错」。这条守门把 reference 的步骤 id 序列、规格键、必答标记
// 逐项对着 specSteps() 断言,漂了就在 CI 里红。
//
// 注:reference 是**兜底快照**(拿不到 CLI 时才用),但它仍要跟得上清单 ——
// 快照过期是「软」问题(拿不到 CLI 才发生),清单与快照对不上是「硬」问题(每次都发生)。
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { specSteps, specToCliArgs } from "./spec";

/** 读 skill 目录下的文件(测试只读,不写) */
function readSkill(rel: string): string {
    return readFileSync(new URL(`../../skills/dshp/${rel}`, import.meta.url), "utf8");
}

const INTERVIEW_MD = readSkill("references/interview.md");
const SKILL_MD = readSkill("SKILL.md");
const DRIVE_MJS = readSkill("scripts/drive-questionnaire.mjs");

/** interview.md 里的一行步骤 */
interface StepRow {
    num: string;
    stepId: string;
    ask: string;
    specKeyCell: string;
    requiredCell: string;
}

/** 取一格(缺列就报错,不静默当空串) */
function cell(cells: string[], index: number): string {
    const v = cells[index];
    if (v === undefined) throw new Error(`步骤清单表缺第 ${index + 1} 列`);
    return v;
}

/** 解析 interview.md 的步骤清单表(表头以「| # | 步骤 id |」开头) */
function parseStepTable(md: string): StepRow[] {
    const lines = md.split("\n");
    const start = lines.findIndex((l) => l.trim().startsWith("| # | 步骤 id |"));
    if (start < 0) {
        throw new Error("interview.md 里找不到步骤清单表(表头应为「| # | 步骤 id | …」)");
    }
    const rows: StepRow[] = [];
    // 跳过表头与分隔行
    for (const line of lines.slice(start + 2)) {
        const t = line.trim();
        if (!t.startsWith("|")) break;
        const cells = t.split("|").slice(1, -1).map((c) => c.trim());
        if (cells.length < 7) throw new Error(`步骤清单表的列数不对:${t}`);
        rows.push({
            num: cell(cells, 0),
            stepId: cell(cells, 1).replace(/`/g, ""),
            ask: cell(cells, 2),
            specKeyCell: cell(cells, 3),
            requiredCell: cell(cells, 4),
        });
    }
    return rows;
}

/** 取 interview.md 的某个一级小节正文 */
function section(md: string, heading: string): string {
    const start = md.indexOf(heading);
    if (start < 0) throw new Error(`interview.md 里找不到小节:${heading}`);
    const rest = md.slice(start + heading.length);
    const next = rest.search(/\n## /);
    return next < 0 ? rest : rest.slice(0, next);
}

describe("skill 的访谈清单快照(interview.md)", () => {
    const rows = parseStepTable(INTERVIEW_MD);

    it("步骤 id 序列与 specSteps() 完全一致", () => {
        expect(rows.map((r) => r.stepId)).toEqual(specSteps().map((s) => s.id));
    });

    it("每行的清单键就是该步骤要填的键(含连带填的键)", () => {
        const steps = specSteps();
        for (const [i, row] of rows.entries()) {
            const step = steps[i];
            if (!step) throw new Error(`清单里没有第 ${i + 1} 步`);
            expect(row.specKeyCell, `${row.stepId} 行的清单键列`).toContain(
                `\`${step.specKey}\``,
            );
            for (const key of step.alsoFills ?? []) {
                expect(row.specKeyCell, `${row.stepId} 行漏了连带键 ${key}`).toContain(
                    `\`${key}\``,
                );
            }
        }
    });

    it("必答标记与清单一致(必答标 ✓,可跳过标「可跳」)", () => {
        const steps = specSteps();
        for (const [i, row] of rows.entries()) {
            const step = steps[i];
            if (!step) throw new Error(`清单里没有第 ${i + 1} 步`);
            if (step.required) {
                expect(row.requiredCell, `${row.stepId} 应标必答`).toContain("✓");
            } else {
                expect(row.requiredCell, `${row.stepId} 应标可跳`).toContain("可跳");
            }
        }
    });

    it("序号连续(1..n),行没漏没多", () => {
        expect(rows.map((r) => r.num)).toEqual(rows.map((_, i) => String(i + 1)));
        expect(rows).toHaveLength(specSteps().length);
    });

    it("每行都有问法(照着念得出来)", () => {
        for (const row of rows) {
            expect(row.ask.length, `${row.stepId} 没有问法`).toBeGreaterThan(0);
        }
    });
});

describe("规格键 → CLI 参数对照表", () => {
    // 能编译出来的参数集合 = 对照表允许出现的全部 flag(编译器是映射的事实源)
    const compilable = new Set<string>();
    for (const spec of [
        {
            route: "custom",
            atoms: ["tool", "ui"],
            eventDomains: ["session"],
            uiSurfaces: ["settings-card"],
            serviceSeams: ["llm"],
            newService: true,
            toolName: "query_orders",
            config: "dynamic",
            dirName: "my-orders",
            pkgName: "orders",
            pluginId: "orders",
            description: "查订单",
            author: "研哥",
            pkgPosition: "bundle",
            target: "next",
            lang: "zh",
        },
        { route: "template", templateKind: "case", template: "quick-tool" },
        { route: "template", templateKind: "preset", template: "tool" },
    ]) {
        for (const arg of specToCliArgs(spec)) {
            if (arg.startsWith("--")) compilable.add(arg);
        }
    }

    it("对照表里写的每个参数都真能编译出来(不许写 CLI 不认的参数)", () => {
        const table = section(INTERVIEW_MD, "## 规格键 → CLI 参数");
        const mentioned = new Set(table.match(/--[a-z][a-z-]*/g) ?? []);
        for (const flag of mentioned) {
            expect(compilable.has(flag), `对照表里的 ${flag} 不在编译产物里`).toBe(true);
        }
    });

    it("每个能编译出来的参数都在对照表里(不许漏)", () => {
        const table = section(INTERVIEW_MD, "## 规格键 → CLI 参数");
        for (const flag of compilable) {
            expect(table, `对照表里漏了 ${flag}`).toContain(flag);
        }
    });
});

describe("skill 的前置条件口径", () => {
    it("SKILL.md 说清了两条实时清单从哪取", () => {
        expect(SKILL_MD).toContain("dshp spec --json");
        expect(SKILL_MD).toContain("dshp list --json");
    });

    it("SKILL.md 声明了「要不要装由用户决定,不要自动装」", () => {
        expect(SKILL_MD).toContain("不要自动装");
        expect(SKILL_MD).toContain("create-dsh-plugin-cli");
    });

    it("SKILL.md 不替 agent 规定用哪个提问工具", () => {
        // 工具由 agent 应用自选:skill 只给语义(逐项确认 / 每项可跳过),
        // 不该出现「用 ask_user」「用宿主结构化提问功能」这类硬性工具规定
        expect(SKILL_MD).not.toContain("ask_user");
        expect(SKILL_MD).not.toContain("结构化提问功能");
    });

    it("interview.md 也守同一条(不规定工具)", () => {
        expect(INTERVIEW_MD).not.toContain("结构化提问功能");
    });
});

describe("驱动脚本不抄能力清单副本", () => {
    it("脚本里没有硬编码的原子/事件域/界面位/缝清单", () => {
        // 抄副本必然漂:CLI 加了原子,脚本还按旧清单拦,用户拿到「CLI 明明支持,脚本说非法」
        for (const symbol of ["const ATOMS", "const EVENT_DOMAINS", "const UI_SURFACES", "const SEAMS"]) {
            expect(DRIVE_MJS, `脚本里又出现了 ${symbol}`).not.toContain(symbol);
        }
    });

    it("脚本不再重写 CLI 已有的硬约束", () => {
        // 界面位依赖原子 / settings-card 与 config=none 的冲突都在 CLI 侧
        // (断言查的是实现片段,不是注释里的文字 —— 注释提到这条规则是应该的)
        expect(DRIVE_MJS).not.toContain('o.uiSurfaces.includes("tool-view")');
        expect(DRIVE_MJS).not.toContain('o.uiSurfaces.includes("settings-card")');
    });

    it("脚本仍保留自己的政策与自检", () => {
        expect(DRIVE_MJS).toContain("--tool-name 给出工具名"); // 脚本政策:比 CLI 更严
        expect(DRIVE_MJS).toContain("missingFiles"); // 生成后自检 + JSON 摘要
    });
});
