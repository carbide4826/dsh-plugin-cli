// 场景预设完整性:id 唯一、能力 id 合法、问卷硬约束成立、每个场景可产出非空生成计划
import { describe, expect, it } from "vitest";
import { planGeneration } from "../atoms";
import type { Answers } from "./types";
import { EVENT_DOMAINS } from "./events";
import { SEAMS } from "./seams";
import { UI_SURFACES } from "./uiSurfaces";
import { SCENARIOS, buildScenarioAnswers, findScenario } from "./scenarios";

// 中性基础答案:场景测试只关心能力组合字段
const base: Answers = {
    dirName: "demo",
    pkgName: "demo",
    pluginId: "demo",
    toolName: "",
    description: "",
    author: "",
    pkgPosition: "bundle",
    atoms: [],
    eventDomains: [],
    uiSurfaces: [],
    serviceCreate: false,
    serviceSeams: [],
    config: "none",
};

/** 按场景预设拼出完整 Answers,走真实 planGeneration */
function planOf(scenarioId: string): ReturnType<typeof planGeneration> {
    const s = SCENARIOS.find((x) => x.id === scenarioId)!;
    return planGeneration({
        ...base,
        atoms: s.capabilities.atoms,
        eventDomains: s.capabilities.eventDomains,
        uiSurfaces: s.capabilities.uiSurfaces,
        serviceCreate: s.capabilities.serviceCreate,
        serviceSeams: s.capabilities.serviceSeams,
        config: s.capabilities.config,
        toolName: s.capabilities.toolName,
    });
}

describe("SCENARIOS 场景预设", () => {
    it("id 与默认目录名唯一且非空", () => {
        const ids = SCENARIOS.map((s) => s.id);
        const dirs = SCENARIOS.map((s) => s.defaultDirName);
        expect(ids.length).toBeGreaterThan(0);
        for (const id of ids) expect(id).not.toBe("");
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(dirs).size).toBe(dirs.length);
    });

    it("能力组合的 id 全部合法(事件域/界面位/缝)", () => {
        const domainIds = EVENT_DOMAINS.map((d) => d.id);
        const surfaceIds = UI_SURFACES.map((s) => s.id);
        const seamIds = SEAMS.map((s) => s.id);
        for (const s of SCENARIOS) {
            for (const d of s.capabilities.eventDomains) {
                expect(domainIds, `场景 ${s.id} 的事件域 ${d}`).toContain(d);
            }
            for (const u of s.capabilities.uiSurfaces) {
                expect(surfaceIds, `场景 ${s.id} 的界面位 ${u}`).toContain(u);
            }
            for (const seam of s.capabilities.serviceSeams) {
                expect(seamIds, `场景 ${s.id} 的缝 ${seam}`).toContain(seam);
            }
        }
    });

    it("问卷硬约束在预设中成立:勾 tool 必给 toolName,settings-card 必配非 none 配置", () => {
        for (const s of SCENARIOS) {
            if (s.capabilities.atoms.includes("tool")) {
                expect(s.capabilities.toolName, `场景 ${s.id}`).not.toBe("");
            }
            if (s.capabilities.uiSurfaces.includes("settings-card")) {
                expect(s.capabilities.config, `场景 ${s.id}`).not.toBe("none");
            }
        }
    });

    it("每个场景都能产出非空生成计划(有模板文件可拷贝)", () => {
        for (const s of SCENARIOS) {
            const plan = planOf(s.id);
            expect(plan.copy.length, `场景 ${s.id} 应有模板文件`).toBeGreaterThan(0);
        }
    });

    it("各场景的落盘文件与预设定位一致", () => {
        expect(planOf("tool").copy.some((f) => f.to === "src/tool.ts")).toBe(true);
        expect(planOf("protocol").copy.some((f) => f.to === "src/protocol.ts")).toBe(true);
        expect(planOf("events").aggregates.some((a) => a.file === "src/events.ts")).toBe(true);
        expect(planOf("llm").aggregates.some((a) => a.file === "src/seams/index.ts")).toBe(true);
        // ui:client 聚合入口 + settings-card 注册层/组件两文件成对落盘
        const ui = planOf("ui");
        expect(ui.aggregates.some((a) => a.file === "src/client/index.ts")).toBe(true);
        expect(ui.copy.some((f) => f.to === "src/client/surfaces/settings-card.ts")).toBe(true);
        expect(ui.copy.some((f) => f.to === "src/client/surfaces/SettingsCard.tsx")).toBe(true);
    });

    it("findScenario 命中与未命中", () => {
        expect(findScenario("tool")?.id).toBe("tool");
        expect(findScenario("nope")).toBeUndefined();
    });
});

describe("buildScenarioAnswers 场景覆盖", () => {
    const tool = SCENARIOS.find((s) => s.id === "tool")!;
    const ui = SCENARIOS.find((s) => s.id === "ui")!;

    it("未提供的字段回落场景预设与推导值", () => {
        const { answers, error } = buildScenarioAnswers(tool, { dirName: "demo" });
        expect(error).toBeUndefined();
        expect(answers!.pkgName).toBe("demo"); // 包名/插件 id 由目录名推导
        expect(answers!.pluginId).toBe("demo");
        expect(answers!.toolName).toBe("example_tool"); // 场景预设
        expect(answers!.pkgPosition).toBe("bundle");
        expect(answers!.description).toBe(tool.description);
        expect(answers!.author).toBe("");
        expect(answers!.config).toBe("none");
    });

    it("提供的字段替换预设/推导值", () => {
        const { answers, error } = buildScenarioAnswers(tool, {
            dirName: "demo",
            pkgName: "@scope/demo",
            pluginId: "demo-x",
            description: "custom desc",
            author: "carbide",
            pkgPosition: "library",
            config: "static",
            toolName: "my_tool",
        });
        expect(error).toBeUndefined();
        expect(answers!.pkgName).toBe("@scope/demo");
        expect(answers!.pluginId).toBe("demo-x");
        expect(answers!.description).toBe("custom desc");
        expect(answers!.author).toBe("carbide");
        expect(answers!.pkgPosition).toBe("library");
        expect(answers!.config).toBe("static"); // 覆盖场景预设的 none
        expect(answers!.toolName).toBe("my_tool");
    });

    it("非法 pkgPosition / config 取值报错", () => {
        expect(
            buildScenarioAnswers(tool, { dirName: "d", pkgPosition: "app" }).error,
        ).toContain("--pkg-position");
        expect(buildScenarioAnswers(tool, { dirName: "d", config: "auto" }).error).toContain(
            "--config",
        );
    });

    it("settings-card 场景禁 --config none,允许 static/dynamic", () => {
        expect(buildScenarioAnswers(ui, { dirName: "d", config: "none" }).error).toContain(
            "settings-card",
        );
        expect(
            buildScenarioAnswers(ui, { dirName: "d", config: "dynamic" }).error,
        ).toBeUndefined();
    });
});
