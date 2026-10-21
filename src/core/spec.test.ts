// 访谈清单守门:清单与 CLI 参数必须一一对应,且缺项判定要准。
// 这条守门存在的理由:清单是「问什么」的事实源,一旦它写出 CLI 不认的参数,
// agent 就会照着填一个 CLI 拒收的组合 —— 用户看到的现象是「问了半天,生成时又报错」。
import { describe, expect, it } from "vitest";
import {
    specGaps,
    specOptions,
    specSteps,
    specToCliArgs,
    specToCreateArgs,
    stepApplies,
    type Spec,
} from "./spec";
import { ATOMS } from "../domain/atoms";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES } from "../domain/uiSurfaces";
import { SEAMS } from "../domain/seams";
import { SCENARIOS } from "../domain/scenarios";
import { TRACK_TARGETS } from "../domain/manifests";
import { listScenarioCases } from "../generate/scenarioCase";
import { getTrackManifest } from "../domain/manifests";

/** CLI 真实认的 create 选项(与 src/cli.ts 的 CreateOptions 对齐) */
const CLI_FLAGS = [
    "--template",
    "--target",
    "--pkg-name",
    "--plugin-id",
    "--tool-name",
    "--description",
    "--author",
    "--pkg-position",
    "--config",
    "--atoms",
    "--event-domains",
    "--ui-surfaces",
    "--service-seams",
    "--new-service",
    "--dry-run",
    "--lang",
];

/** 规格键 → CLI 参数(清单里用到的一一映射) */
const SPEC_KEY_TO_FLAG: Record<string, string> = {
    template: "--template",
    toolName: "--tool-name",
    config: "--config",
    pkgName: "--pkg-name",
    pluginId: "--plugin-id",
    description: "--description",
    author: "--author",
    pkgPosition: "--pkg-position",
    target: "--target",
    lang: "--lang",
    atoms: "--atoms",
    eventDomains: "--event-domains",
    uiSurfaces: "--ui-surfaces",
    serviceSeams: "--service-seams",
    newService: "--new-service",
    // 目录名是 CLI 的位置参数,不是 flag
    dirName: "(位置参数)",
};

/** 按 id 取步骤 */
function specStep(id: string) {
    const s = specSteps().find((x) => x.id === id);
    if (!s) throw new Error(`没有这个步骤:${id}`);
    return s;
}

describe("访谈清单", () => {
    it("每一步都有问法,且必答/可跳过都说得清", () => {
        for (const s of specSteps()) {
            expect(s.ask.length, `${s.id} 没有问法`).toBeGreaterThan(0);
            expect(s.id.length).toBeGreaterThan(0);
            expect(s.specKey.length).toBeGreaterThan(0);
            if (!s.required) {
                expect(s.skip, `${s.id} 标了可跳过却没说跳过意味着什么`).toBeTruthy();
            }
        }
    });

    it("每个规格键都有对应的 CLI 参数(不许写出 CLI 不认的键)", () => {
        for (const s of specSteps()) {
            // need / route 是访谈专用的键(不落到 CLI 参数)
            if (s.id === "need" || s.id === "route") continue;
            const flag = SPEC_KEY_TO_FLAG[s.specKey];
            expect(flag, `${s.id} 的规格键 ${s.specKey} 没有登记 CLI 参数`).toBeTruthy();
            if (flag === "(位置参数)") continue; // 目录名走位置参数
            expect(CLI_FLAGS, `${s.specKey} → ${flag} 不是 CLI 认的参数`).toContain(flag);
        }
    });

    it("步骤 id 唯一(跳过记录靠它,重了会串)", () => {
        const ids = specSteps().map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("路线未定之前不追问路线相关的步骤", () => {
        const spec: Spec = { need: "查订单" };
        for (const s of specSteps()) {
            if (s.when) {
                expect(stepApplies(s, spec), `${s.id} 在未选路线时不该问`).toBe(false);
            }
        }
    });

    it("选了自配就不问模板,选了模板就不问原子", () => {
        const custom: Spec = { need: "x", route: "custom" };
        expect(stepApplies(specStep("template"), custom)).toBe(false);
        expect(stepApplies(specStep("atoms"), custom)).toBe(true);
        const tpl: Spec = { need: "x", route: "template" };
        expect(stepApplies(specStep("template"), tpl)).toBe(true);
        expect(stepApplies(specStep("atoms"), tpl)).toBe(false);
    });
});

describe("specOptions(选项现取)", () => {
    it("原子 / 事件域 / 界面位 / 缝 与领域清单同源", () => {
        expect(specOptions("atoms").map((o) => o.value)).toEqual(ATOMS.map((a) => a.id));
        expect(specOptions("domains").map((o) => o.value)).toEqual(
            EVENT_DOMAINS.map((d) => d.id),
        );
        expect(specOptions("surfaces").map((o) => o.value)).toEqual(
            UI_SURFACES.map((s) => s.id),
        );
        expect(specOptions("seams").map((o) => o.value)).toEqual(SEAMS.map((s) => s.id));
    });

    it("模板选项 = 预设 + 精选案例,且案例按 id 去重", () => {
        const opts = specOptions("templates");
        const presetIds = opts.filter((o) => o.kind === "preset").map((o) => o.value);
        const caseIds = opts.filter((o) => o.kind === "case").map((o) => o.value);
        expect(presetIds).toEqual(SCENARIOS.map((s) => s.id));
        // 案例在两轨各有一份,按 id 去重后不该出现重复项
        expect(new Set(caseIds).size).toBe(caseIds.length);
        const allCases = new Set(
            TRACK_TARGETS.flatMap((t) => listScenarioCases(getTrackManifest(t))),
        );
        expect(new Set(caseIds)).toEqual(allCases);
    });

    it("界面位选项带依赖原子(模型据此知道要补哪个原子)", () => {
        const toolView = specOptions("surfaces").find((o) => o.value === "tool-view");
        expect(toolView?.requires).toContain("tool");
        expect(toolView?.requires).toContain("ui");
    });

    it("目标轨选项带各轨钉的 dsh 版本", () => {
        const opts = specOptions("target");
        expect(opts.map((o) => o.value)).toEqual([...TRACK_TARGETS]);
        expect(opts[0]?.label).toContain(getTrackManifest("latest").version);
    });
});

describe("specGaps(缺项判定)", () => {
    it("空规格:必答项都没答,还不 ready", () => {
        const gaps = specGaps({});
        expect(gaps.ready).toBe(false);
        expect(gaps.requiredPending.map((s) => s.id)).toContain("need");
        expect(gaps.requiredPending.map((s) => s.id)).toContain("route");
        expect(gaps.next?.id).toBe("need");
    });

    it("需求 + 路线定了 → 只剩模板/原子那一步必答", () => {
        const gaps = specGaps({ need: "查订单", route: "template" });
        expect(gaps.ready).toBe(false);
        expect(gaps.requiredPending.map((s) => s.id)).toEqual(["template"]);
        expect(gaps.next?.id).toBe("template");
    });

    it("模板路线选完 → 必答项齐了(可选项仍待问,但不挡开跑)", () => {
        const gaps = specGaps({
            need: "查订单",
            route: "template",
            template: "quick-tool",
            templateKind: "case",
        });
        expect(gaps.ready).toBe(true);
        expect(gaps.requiredPending).toHaveLength(0);
        // 可跳过的项仍在待问列表里(agent 要逐项问,用户可跳过)
        expect(gaps.pending.map((s) => s.id)).toContain("dirName");
    });

    it("自配路线:选了原子才追问事件域/界面位/缝", () => {
        const withTool = specGaps({ need: "x", route: "custom", atoms: ["tool"] });
        expect(withTool.pending.map((s) => s.id)).not.toContain("surfaces");
        expect(withTool.pending.map((s) => s.id)).not.toContain("domains");
        expect(withTool.pending.map((s) => s.id)).toContain("toolName");

        const withUi = specGaps({ need: "x", route: "custom", atoms: ["tool", "ui"] });
        expect(withUi.pending.map((s) => s.id)).toContain("surfaces");
    });

    it("用户跳过的项不再算待问(跳过 = 交给默认值)", () => {
        const gaps = specGaps({
            need: "x",
            route: "template",
            template: "quick-tool",
            templateKind: "case",
            skipped: ["author", "description"],
        });
        expect(gaps.pending.map((s) => s.id)).not.toContain("author");
        expect(gaps.pending.map((s) => s.id)).not.toContain("description");
    });
});

describe("specToCliArgs(规格 → CLI 参数)", () => {
    it("模板路线:案例带 -s,预设不带(按 route + templateKind 推导模式)", () => {
        expect(
            specToCliArgs({ route: "template", templateKind: "case", template: "quick-tool" }),
        ).toEqual(["-s", "--template", "quick-tool"]);
        expect(specToCliArgs({ route: "template", templateKind: "preset", template: "tool" })).toEqual([
            "--template",
            "tool",
        ]);
        // 显式 mode 也认(agent 可能直接给了 mode)
        expect(specToCliArgs({ mode: "case", template: "quick-tool" })).toEqual([
            "-s",
            "--template",
            "quick-tool",
        ]);
    });

    it("自配路线:能力参数齐", () => {
        const args = specToCliArgs({
            route: "custom",
            atoms: ["tool", "ui"],
            eventDomains: ["session"],
            uiSurfaces: ["settings-card"],
            serviceSeams: ["llm"],
            newService: true,
            toolName: "query_orders",
            config: "dynamic",
        });
        expect(args).toContain("--atoms");
        expect(args[args.indexOf("--atoms") + 1]).toBe("tool,ui");
        expect(args).toContain("--event-domains");
        expect(args).toContain("--ui-surfaces");
        expect(args).toContain("--service-seams");
        expect(args).toContain("--new-service");
        expect(args).toContain("--tool-name");
        expect(args).toContain("--config");
    });

    it("自配路线一个原子都没选也显式给 --atoms(空值仍是非交互路径)", () => {
        const args = specToCliArgs({ route: "custom", atoms: [] });
        expect(args).toContain("--atoms");
        expect(args[args.indexOf("--atoms") + 1]).toBe("");
    });

    it("跳过的项不出现(交给 CLI 默认值)", () => {
        const args = specToCliArgs({ route: "template", templateKind: "preset", template: "tool" });
        expect(args).not.toContain("--author");
        expect(args).not.toContain("--description");
        expect(args).not.toContain("--lang");
    });

    it("细节项映射到对应参数", () => {
        const args = specToCliArgs({
            route: "custom",
            atoms: ["tool"],
            dirName: "my-orders",
            pkgName: "@acme/orders",
            pluginId: "orders",
            description: "查订单",
            author: "研哥",
            pkgPosition: "library",
            target: "next",
            lang: "zh",
        });
        expect(args).toContain("my-orders");
        expect(args[args.indexOf("--pkg-name") + 1]).toBe("@acme/orders");
        expect(args[args.indexOf("--plugin-id") + 1]).toBe("orders");
        expect(args[args.indexOf("--target") + 1]).toBe("next");
        expect(args[args.indexOf("--lang") + 1]).toBe("zh");
    });
});

describe("specToCreateArgs(规格 → create 工具入参)", () => {
    it("案例与预设走不同字段", () => {
        expect(
            specToCreateArgs({ route: "template", templateKind: "case", template: "quick-tool" }),
        ).toMatchObject({ mode: "case", case: "quick-tool" });
        expect(
            specToCreateArgs({ route: "template", templateKind: "preset", template: "tool" }),
        ).toMatchObject({ mode: "preset", preset: "tool" });
    });

    it("自配路线带能力项与细节项", () => {
        const args = specToCreateArgs({
            route: "custom",
            atoms: ["tool", "ui"],
            uiSurfaces: ["settings-card"],
            config: "dynamic",
            dirName: "my-orders",
            target: "next",
        });
        expect(args.mode).toBe("free");
        expect(args.atoms).toEqual(["tool", "ui"]);
        expect(args.uiSurfaces).toEqual(["settings-card"]);
        expect(args.config).toBe("dynamic");
        expect(args.dirName).toBe("my-orders");
        expect(args.target).toBe("next");
    });

    it("不把访谈用的键漏进 create 入参(need / skipped 不是 CLI 参数)", () => {
        const args = specToCreateArgs({
            need: "查订单",
            skipped: ["author"],
            route: "template",
            templateKind: "preset",
            template: "tool",
        });
        expect(args.need).toBeUndefined();
        expect(args.skipped).toBeUndefined();
    });
});
