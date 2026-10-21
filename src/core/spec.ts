// 生成规格清单:一次访谈要问的每一步 —— 问什么、能不能跳过、跳过用啥默认、选项从哪来。
//
// 为什么要有这一层:此前 skill 与 MCP 都只是「CLI 参数的转述」,模型拿到的是一张填空表,
// 不是一次访谈,于是问得太浅(问一两句就开跑,存储位置/命名/配置这些全靠默认兜)。
// 清单把「问什么」变成单一事实源:skill 读它、MCP 暴露它、CLI 也能打印它 —— 三边不会各写一份,
// 也不会随 CLI 加参数而漂(守门测试断言清单的每个键都真是 CLI 认的参数)。
//
// 用法(agent 侧):
// 1. 取清单(specSteps / `dshp spec --json` / MCP 的 dshp_spec)
// 2. 逐个问,每步可跳过(跳过 = 不填该键,并记进 spec.skipped)
// 3. 随时用 specGaps(spec) 看「还缺什么、够不够开跑」
// 4. 齐了用 specToCliArgs(spec) 编译成 CLI 参数(与 CLI 需要的完全一致)
import { ATOMS } from "../domain/atoms";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES, SURFACE_REQUIRES } from "../domain/uiSurfaces";
import { SEAMS } from "../domain/seams";
import { SCENARIOS } from "../domain/scenarios";
import { TRACK_TARGETS, getTrackManifest, type TrackTarget } from "../domain/manifests";
import { listScenarioCases } from "../generate/scenarioCase";
import { t } from "../locales";

/** 生成模式 */
export type SpecMode = "preset" | "case" | "free";

/** 选项来源(取值现取,不抄快照) */
export type SpecOptionKind =
    | "route"
    | "templates"
    | "atoms"
    | "domains"
    | "surfaces"
    | "seams"
    | "config"
    | "target"
    | "pkgPosition"
    | "lang";

/** 一个可选项 */
export interface SpecOption {
    value: string;
    label: string;
    hint?: string;
    /** 模板类选项带类型(预设组合 / 精选案例) */
    kind?: "preset" | "case";
    /** 该选项的依赖原子(界面位用) */
    requires?: readonly string[];
}

/** 适用条件(按已收集的规格判定) */
export interface SpecWhen {
    /** 看规格的哪个键 */
    key: string;
    /** 该键的取值须包含此值(数组按包含判定,布尔按相等) */
    has?: string;
}

/** 一个访谈步骤 */
export interface SpecStep {
    /** 步骤 id(稳定:用于「已问过/已跳过」的判定) */
    id: string;
    /** 填进规格的键 */
    specKey: string;
    /** 问法(模型可直接用,也可按用户语气改写) */
    ask: string;
    /** 必答 / 可跳过 */
    required: boolean;
    /** 跳过的含义(默认值/后果) */
    skip?: string;
    /** 只在这些模式下问 */
    modes?: SpecMode[];
    /** 适用条件(全部满足才问) */
    when?: SpecWhen[];
    /** 选项来源 */
    options?: SpecOptionKind;
    /** 问的时候要顺带提醒的坑 */
    note?: string;
    /** 该步骤还会连带填的键(如模板步骤同时定「是预设还是案例」) */
    alsoFills?: string[];
}

/** 收集到的规格(键与 dshp_create_plugin 的入参同名) */
export type Spec = Record<string, unknown> & {
    /** 用户选择跳过的步骤 id */
    skipped?: string[];
};

/**
 * 模式判定:显式 mode 优先,否则按已收集的规格推导 ——
 * 选了「自配」就是 free;选了模板则看它是预设组合还是精选案例。
 */
function modeOf(spec: Spec): SpecMode | undefined {
    const m = spec.mode;
    if (m === "preset" || m === "case" || m === "free") return m;
    if (spec.route === "custom") return "free";
    if (spec.templateKind === "case") return "case";
    if (spec.templateKind === "preset") return "preset";
    return undefined;
}

/**
 * 全部访谈步骤(顺序 = 建议的提问顺序)。
 * 顺序刻意分成三段:先定「要什么」(需求 → 路线 → 模板/原子),再定「有什么能力」
 * (事件域/界面位/缝/服务/工具名/配置),最后定「叫什么、放哪、配套哪代宿主」。
 */
export function specSteps(): SpecStep[] {
    return [
        {
            id: "need",
            specKey: "need",
            ask: t("spec.need.ask"),
            required: true,
            note: t("spec.need.note"),
        },
        {
            id: "route",
            specKey: "route",
            ask: t("spec.route.ask"),
            required: true,
            options: "route",
            note: t("spec.route.note"),
        },
        {
            id: "template",
            specKey: "template",
            alsoFills: ["templateKind"],
            ask: t("spec.template.ask"),
            required: true,
            modes: ["preset", "case"],
            when: [{ key: "route", has: "template" }],
            options: "templates",
            note: t("spec.template.note"),
        },
        {
            id: "atoms",
            specKey: "atoms",
            ask: t("spec.atoms.ask"),
            required: true,
            modes: ["free"],
            when: [{ key: "route", has: "custom" }],
            options: "atoms",
            note: t("spec.atoms.note"),
        },
        {
            id: "domains",
            specKey: "eventDomains",
            ask: t("spec.domains.ask"),
            required: false,
            skip: t("spec.domains.skip"),
            modes: ["free"],
            when: [
                { key: "route", has: "custom" },
                { key: "atoms", has: "events" },
            ],
            options: "domains",
        },
        {
            id: "surfaces",
            specKey: "uiSurfaces",
            ask: t("spec.surfaces.ask"),
            required: false,
            skip: t("spec.surfaces.skip"),
            modes: ["free"],
            when: [
                { key: "route", has: "custom" },
                { key: "atoms", has: "ui" },
            ],
            options: "surfaces",
            note: t("spec.surfaces.note"),
        },
        {
            id: "seams",
            specKey: "serviceSeams",
            ask: t("spec.seams.ask"),
            required: false,
            skip: t("spec.seams.skip"),
            modes: ["free"],
            when: [
                { key: "route", has: "custom" },
                { key: "atoms", has: "service" },
            ],
            options: "seams",
        },
        {
            id: "newService",
            specKey: "newService",
            ask: t("spec.newService.ask"),
            required: false,
            skip: t("spec.newService.skip"),
            modes: ["free"],
            when: [
                { key: "route", has: "custom" },
                { key: "atoms", has: "service" },
            ],
        },
        {
            id: "toolName",
            specKey: "toolName",
            ask: t("spec.toolName.ask"),
            required: false,
            skip: t("spec.toolName.skip"),
            modes: ["free"],
            when: [
                { key: "route", has: "custom" },
                { key: "atoms", has: "tool" },
            ],
        },
        {
            id: "config",
            specKey: "config",
            ask: t("spec.config.ask"),
            required: false,
            skip: t("spec.config.skip"),
            options: "config",
        },
        {
            id: "dirName",
            specKey: "dirName",
            ask: t("spec.dirName.ask"),
            required: false,
            skip: t("spec.dirName.skip"),
            note: t("spec.dirName.note"),
        },
        {
            id: "pkgName",
            specKey: "pkgName",
            ask: t("spec.pkgName.ask"),
            required: false,
            skip: t("spec.pkgName.skip"),
        },
        {
            id: "pluginId",
            specKey: "pluginId",
            ask: t("spec.pluginId.ask"),
            required: false,
            skip: t("spec.pluginId.skip"),
        },
        {
            id: "pkgPosition",
            specKey: "pkgPosition",
            ask: t("spec.pkgPosition.ask"),
            required: false,
            skip: t("spec.pkgPosition.skip"),
            options: "pkgPosition",
        },
        {
            id: "target",
            specKey: "target",
            ask: t("spec.target.ask"),
            required: false,
            skip: t("spec.target.skip"),
            options: "target",
        },
        {
            id: "description",
            specKey: "description",
            ask: t("spec.description.ask"),
            required: false,
            skip: t("spec.description.skip"),
        },
        {
            id: "author",
            specKey: "author",
            ask: t("spec.author.ask"),
            required: false,
            skip: t("spec.author.skip"),
        },
        {
            id: "lang",
            specKey: "lang",
            ask: t("spec.lang.ask"),
            required: false,
            skip: t("spec.lang.skip"),
            options: "lang",
        },
    ];
}

/** 取某来源的选项(现取,不抄快照) */
export function specOptions(kind: SpecOptionKind): SpecOption[] {
    switch (kind) {
        case "route":
            return [
                { value: "template", label: t("spec.route.optionTemplate") },
                { value: "custom", label: t("spec.route.optionCustom") },
            ];
        case "templates": {
            // 精选案例按轨各有一份,但 id 相同 —— 选项按 id 去重,提示里列出该案例存在于哪几轨
            // (若两轨案例集不同,选了目标轨没有的案例,CLI 会报 CASE_NOT_FOUND)
            const tracksOf = new Map<string, string[]>();
            for (const target of TRACK_TARGETS) {
                for (const id of listScenarioCases(getTrackManifest(target))) {
                    const list = tracksOf.get(id) ?? [];
                    list.push(target);
                    tracksOf.set(id, list);
                }
            }
            return [
                ...SCENARIOS.map((s) => ({
                    value: s.id,
                    kind: "preset" as const,
                    label: s.label(),
                    hint: s.description,
                })),
                ...[...tracksOf.entries()].map(([id, tracks]) => ({
                    value: id,
                    kind: "case" as const,
                    label: id,
                    hint: t("spec.template.caseHint", {
                        tracks: tracks.join(" / "),
                        dsh: getTrackManifest(tracks[0] as TrackTarget).version,
                    }),
                })),
            ];
        }
        case "atoms":
            return ATOMS.map((a) => ({
                value: a.id,
                label: a.label(),
                hint: a.desc(),
            }));
        case "domains":
            return EVENT_DOMAINS.map((d) => ({
                value: d.id,
                label: d.label(),
                hint: d.desc(),
            }));
        case "surfaces":
            return UI_SURFACES.map((s) => ({
                value: s.id,
                label: s.label(),
                hint: s.desc(),
                requires: SURFACE_REQUIRES[s.id],
            }));
        case "seams":
            return SEAMS.map((s) => ({
                value: s.id,
                label: s.label(),
                hint: s.desc(),
            }));
        case "config":
            // settings-card 界面位配 none 会被 CLI 拒(设置卡片必须有配置可展示),故选项现裁
            return [
                { value: "none", label: t("spec.config.none") },
                { value: "static", label: t("spec.config.static") },
                { value: "dynamic", label: t("spec.config.dynamic") },
            ];
        case "target":
            return TRACK_TARGETS.map((target) => ({
                value: target,
                label: `${target} · dsh ${getTrackManifest(target).version}`,
            }));
        case "pkgPosition":
            return [
                { value: "bundle", label: t("spec.pkgPosition.bundle") },
                { value: "library", label: t("spec.pkgPosition.library") },
            ];
        case "lang":
            return [
                { value: "zh", label: "中文" },
                { value: "en", label: "English" },
            ];
    }
}

/** 步骤在当前规格下是否适用(模式 + 条件) */
export function stepApplies(step: SpecStep, spec: Spec): boolean {
    // 注意:step.modes 只用于展示与筛选(「这一步属于哪条路线」),
    // 适用与否一律看 step.when —— 否则「路线还没定」会误伤路线自己的那一步。
    if (step.when) {
        for (const cond of step.when) {
            const value = spec[cond.key];
            if (cond.has === undefined) {
                if (value === undefined) return false;
                continue;
            }
            if (Array.isArray(value)) {
                if (!value.includes(cond.has)) return false;
            } else if (value !== cond.has) {
                return false;
            }
        }
    }
    return true;
}

/** 步骤是否已被回答(规格里有值,或用户显式跳过) */
export function stepAnswered(step: SpecStep, spec: Spec): boolean {
    if (spec[step.specKey] !== undefined) return true;
    if (step.alsoFills?.some((k) => spec[k] !== undefined)) return true;
    return (spec.skipped ?? []).includes(step.id);
}

/** 缺项判定结果 */
export interface SpecGaps {
    /** 还该问的步骤(按建议顺序) */
    pending: SpecStep[];
    /** 其中必答的(没这些就不能开跑) */
    requiredPending: SpecStep[];
    /** 够不够开跑(必答项都齐了) */
    ready: boolean;
    /** 下一问(建议问这个) */
    next: SpecStep | null;
}

/**
 * 看一份收集到哪一步的规格,还缺什么
 * @param spec - 已收集的规格(含 skipped: 用户跳过的步骤 id)
 * @returns 缺项判定
 */
export function specGaps(spec: Spec): SpecGaps {
    const steps = specSteps().filter((s) => stepApplies(s, spec));
    const pending = steps.filter((s) => !stepAnswered(s, spec));
    const requiredPending = pending.filter((s) => s.required);
    return {
        pending,
        requiredPending,
        ready: requiredPending.length === 0,
        next: pending[0] ?? null,
    };
}

/**
 * 规格 → CLI 参数(与 dshp create 接受的参数完全一致)。
 * 跳过的项不出现(交给 CLI 默认值);自由组合路线一个能力都没选时补 `--atoms ""`
 * (空值仍是非交互路径,避免落进交互问卷)。
 * @param spec - 收集好的规格
 * @returns CLI 参数数组(不含子命令名)
 */
export function specToCliArgs(spec: Spec): string[] {
    const args: string[] = [];
    const mode = modeOf(spec);
    const templateKind = spec.templateKind;
    const template = spec.template;

    if (mode === "case") {
        args.push("-s", "--template", String(template));
    } else if (mode === "preset") {
        args.push("--template", String(template));
    } else if (mode === "free") {
        const atoms = (spec.atoms as string[] | undefined) ?? [];
        // 空能力集也要显式给 --atoms,否则 CLI 会落进交互问卷
        args.push("--atoms", atoms.join(","));
        if (spec.eventDomains) {
            args.push("--event-domains", (spec.eventDomains as string[]).join(","));
        }
        if (spec.uiSurfaces) {
            args.push("--ui-surfaces", (spec.uiSurfaces as string[]).join(","));
        }
        if (spec.serviceSeams) {
            args.push("--service-seams", (spec.serviceSeams as string[]).join(","));
        }
        if (spec.newService === true) args.push("--new-service");
    }

    if (spec.toolName !== undefined) {
        args.push("--tool-name", String(spec.toolName));
    }
    if (spec.config !== undefined) {
        args.push("--config", String(spec.config));
    }
    if (spec.dirName !== undefined) {
        args.push(String(spec.dirName));
    }
    if (spec.pkgName !== undefined) {
        args.push("--pkg-name", String(spec.pkgName));
    }
    if (spec.pluginId !== undefined) {
        args.push("--plugin-id", String(spec.pluginId));
    }
    if (spec.description !== undefined) {
        args.push("--description", String(spec.description));
    }
    if (spec.author !== undefined) {
        args.push("--author", String(spec.author));
    }
    if (spec.pkgPosition !== undefined) {
        args.push("--pkg-position", String(spec.pkgPosition));
    }
    if (spec.target !== undefined) {
        args.push("--target", String(spec.target));
    }
    if (spec.lang !== undefined) {
        args.push("--lang", String(spec.lang));
    }
    void templateKind;
    return args;
}

/**
 * 规格 → dshp_create_plugin 的入参(与 CLI 参数同形,便于两条路互换)
 * @param spec - 收集好的规格
 * @returns create 工具入参
 */
export function specToCreateArgs(spec: Spec): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const mode = modeOf(spec);
    if (mode === "case" || mode === "preset") {
        out.mode = mode;
        if (spec.template !== undefined) {
            if (mode === "case") out.case = spec.template;
            else out.preset = spec.template;
        }
    } else if (mode === "free") {
        out.mode = "free";
        for (const key of [
            "atoms",
            "eventDomains",
            "uiSurfaces",
            "serviceSeams",
            "newService",
            "config",
            "toolName",
        ]) {
            if (spec[key] !== undefined) out[key] = spec[key];
        }
    }
    for (const key of [
        "dirName",
        "pkgName",
        "pluginId",
        "description",
        "author",
        "pkgPosition",
        "target",
        "lang",
    ]) {
        if (spec[key] !== undefined) out[key] = spec[key];
    }
    return out;
}
