// planGeneration 的裁剪与并集逻辑单测
import { describe, expect, it } from "vitest";
import { planGeneration } from "./atoms";
import type { Answers } from "./domain/types";

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

describe("planGeneration", () => {
    it("纯骨架:零勾选产出空计划", () => {
        const plan = planGeneration(base);
        expect(plan.copy).toEqual([]);
        expect(plan.index.injects).toEqual([]);
        expect(plan.index.calls).toEqual([]);
        expect(plan.aggregates).toEqual([]);
        expect(plan.readmeStructure).toEqual([]);
    });

    it("单 tool:拷 tool.ts + inject tools", () => {
        const plan = planGeneration({ ...base, atoms: ["tool"] });
        expect(plan.copy).toEqual([{ from: "tool/src/tool.ts", to: "src/tool.ts" }]);
        expect(plan.index.injects).toEqual(["tools"]);
        expect(plan.index.imports).toEqual(['import { registerTool } from "./tool.ts"']);
        expect(plan.index.calls).toEqual(["registerTool(ctx)"]);
    });

    it("组合:events 只留勾选域,service 缝并入 inject,ui 只拷勾选界面位", () => {
        const plan = planGeneration({
            ...base,
            atoms: ["tool", "events", "service", "ui", "protocol"],
            eventDomains: ["tools", "session"],
            serviceCreate: true,
            serviceSeams: ["llm"],
            uiSurfaces: ["settings-card", "sidebar"],
        });

        // inject 并集:tool + llm 缝 + protocol(顺序按规范原子序)
        expect(plan.index.injects).toEqual(["tools", "llm", "agents"]);

        // events 聚合只含 tools/session 两域
        const eventsAgg = plan.aggregates.find((a) => a.file === "src/events.ts");
        expect(eventsAgg?.imports).toEqual([
            'import { registerToolsListeners } from "./domains/tools.ts"',
            'import { registerSessionListeners } from "./domains/session.ts"',
        ]);

        // service:自建服务 + llm 缝聚合只含 llm 一行(聚合入口在 seams/ 内,导入无目录前缀)
        expect(plan.index.calls).toContain("ctx.plugin(ExampleService) // 挂载自有服务");
        const seamsAgg = plan.aggregates.find((a) => a.file === "src/seams/index.ts");
        expect(seamsAgg?.imports).toEqual(['import { registerLlmSeam } from "./llm.ts"']);
        expect(seamsAgg?.calls).toHaveLength(1);
        expect(seamsAgg?.calls[0]).toContain("registerLlmSeam");

        // ui:勾 2 个界面位 → 各拷注册层(.ts)+ 组件(.tsx),共 4 个文件;聚合只含 2 行
        const uiCopies = plan.copy.filter((c) => c.from.startsWith("ui/"));
        expect(uiCopies).toHaveLength(4);
        expect(uiCopies).toContainEqual({
            from: "ui/src/client/surfaces/sidebar-panel.ts",
            to: "src/client/surfaces/sidebar-panel.ts",
        });
        const clientAgg = plan.aggregates.find((a) => a.file === "src/client/index.ts");
        expect(clientAgg?.calls).toHaveLength(2);
    });

    it("service 只勾缝不新建:不拷 service.ts,inject 只来自缝", () => {
        const plan = planGeneration({
            ...base,
            atoms: ["service"],
            serviceCreate: false,
            serviceSeams: ["web", "storage"],
        });
        expect(plan.copy.some((c) => c.to === "src/service.ts")).toBe(false);
        expect(plan.index.injects).toEqual(["web", "storage"]);
        expect(plan.index.imports).toContain('import { registerServiceSeams } from "./seams/index.ts"');
    });
});
