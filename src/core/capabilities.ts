// 自由组合的纯函数入口:把「命令行给的能力选择」变成完整 Answers,并做全部硬约束校验。
//
// 为什么需要这一层:此前自由原子组合只有交互问卷一条路(TTY),agent/脚本/CI 无法非交互地
// 表达「我要 tool + ui + settings-card」这种意图。--template(预设)与 -s(案例)都锁死能力集,
// 不是自由组合。这层把选择与校验从 UI 里抽出来,CLI 与将来的 MCP 共用同一套规则。
//
// 约束(与交互问卷保持一致,同一份校验逻辑,不各写一套):
// - 原子/事件域/界面位/缝的 id 必须存在(否则报对应的 UNKNOWN_* 码)
// - 界面位依赖的原子必须同勾(否则界面位没有注册键,生成出静默不渲染的哑界面)
// - settings-card 界面位需要配置可展示:config=none 与它冲突
// - 勾了 tool 原子就得有工具名(默认 example_tool)
import type { Answers, AtomId, ConfigMode } from "../domain/types";
import { ATOMS } from "../domain/atoms";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES, unsatisfiedSurfaces } from "../domain/uiSurfaces";
import { SEAMS } from "../domain/seams";
import { DshpError } from "./errors";

/** 自由组合的输入(命令行给的能力选择;身份/元信息类字段由调用方另填) */
export interface CapabilitySelection {
    /** 原子 id 列表(空 = 纯骨架) */
    atoms?: string[];
    /** 事件域 id 列表 */
    eventDomains?: string[];
    /** 界面位 id 列表 */
    uiSurfaces?: string[];
    /** 能力缝 id 列表 */
    serviceSeams?: string[];
    /** 是否新建自有服务 */
    serviceCreate?: boolean;
    /** 配置方式;缺省 none */
    config?: string;
    /** 工具名(勾了 tool 原子时用;缺省 example_tool) */
    toolName?: string;
}

const CONFIG_MODES = ["none", "static", "dynamic"] as const satisfies readonly ConfigMode[];

/** 逗号分隔的列表参数 → 去空去重的 id 数组(保序) */
export function parseIdList(raw: string | undefined): string[] | undefined {
    if (raw === undefined) return undefined;
    const ids = raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    return [...new Set(ids)];
}

/**
 * 校验并归一化一组能力选择
 * @param sel - 能力选择(各字段可缺省,缺省即不选)
 * @returns 归一化后的能力片段(全部字段都有值)
 * @throws DshpError 非法 id / 界面位依赖未满足 / config 冲突
 */
export function resolveCapabilities(sel: CapabilitySelection): {
    atoms: AtomId[];
    eventDomains: string[];
    uiSurfaces: string[];
    serviceCreate: boolean;
    serviceSeams: string[];
    config: ConfigMode;
    toolName: string;
} {
    // 原子:逐个查清单(去重保序)
    const atoms: AtomId[] = [];
    for (const id of sel.atoms ?? []) {
        if (!ATOMS.some((a) => a.id === id)) {
            throw new DshpError("ATOM_UNKNOWN", {
                name: id,
                ids: ATOMS.map((a) => a.id).join(", "),
            });
        }
        if (!atoms.includes(id as AtomId)) atoms.push(id as AtomId);
    }

    // 事件域:逐个查清单
    const eventDomains: string[] = [];
    for (const id of sel.eventDomains ?? []) {
        if (!EVENT_DOMAINS.some((d) => d.id === id)) {
            throw new DshpError("EVENT_DOMAIN_UNKNOWN", {
                name: id,
                ids: EVENT_DOMAINS.map((d) => d.id).join(", "),
            });
        }
        if (!eventDomains.includes(id)) eventDomains.push(id);
    }

    // 界面位:逐个查清单
    const uiSurfaces: string[] = [];
    for (const id of sel.uiSurfaces ?? []) {
        if (!UI_SURFACES.some((s) => s.id === id)) {
            throw new DshpError("UI_SURFACE_UNKNOWN", {
                name: id,
                ids: UI_SURFACES.map((s) => s.id).join(", "),
            });
        }
        if (!uiSurfaces.includes(id)) uiSurfaces.push(id);
    }

    // 能力缝:逐个查清单
    const serviceSeams: string[] = [];
    for (const id of sel.serviceSeams ?? []) {
        if (!SEAMS.some((s) => s.id === id)) {
            throw new DshpError("SEAM_UNKNOWN", {
                name: id,
                ids: SEAMS.map((s) => s.id).join(", "),
            });
        }
        if (!serviceSeams.includes(id)) serviceSeams.push(id);
    }

    // 界面位依赖原子:同交互问卷的硬约束(缺原子就没有注册键,界面位静默不渲染)
    const blocking = unsatisfiedSurfaces(uiSurfaces, atoms);
    if (blocking.length > 0) {
        throw new DshpError("SURFACE_REQUIRES_ATOM", {
            surfaces: blocking.map((s) => s.id).join(", "),
            atoms: [...new Set(blocking.flatMap((s) => s.requires))].join(" "),
        });
    }

    // 配置方式:取值校验 + settings-card 冲突
    const config = (sel.config ?? "none") as ConfigMode;
    if (!(CONFIG_MODES as readonly string[]).includes(config)) {
        throw new DshpError("CONFIG_INVALID", {
            values: CONFIG_MODES.join(" | "),
        });
    }
    if (config === "none" && uiSurfaces.includes("settings-card")) {
        throw new DshpError("CONFIG_NONE_REQUIRES_SETTINGS_CARD", {
            id: "自由组合 free combination",
        });
    }

    // 工具名:勾了 tool 才有意义(未勾则清空,不留残值)
    const toolName = atoms.includes("tool") ? (sel.toolName ?? "example_tool") : "";

    return {
        atoms,
        eventDomains,
        uiSurfaces,
        serviceCreate: sel.serviceCreate ?? false,
        serviceSeams,
        config,
        toolName,
    };
}

/**
 * 自由组合入口:能力选择 + 身份/元信息 → 完整 Answers
 * @param sel - 能力选择
 * @param identity - 身份与元信息(目录名/包名/插件 id/描述/作者/包定位)
 * @returns 完整问卷答案
 * @throws DshpError 能力选择非法(见 resolveCapabilities)
 */
export function buildFreeAnswers(
    sel: CapabilitySelection,
    identity: {
        dirName: string;
        pkgName?: string;
        pluginId?: string;
        description?: string;
        author?: string;
        pkgPosition?: string;
    },
): Answers {
    const caps = resolveCapabilities(sel);
    const pkgPosition = identity.pkgPosition ?? "bundle";
    if (pkgPosition !== "bundle" && pkgPosition !== "library") {
        throw new DshpError("PKG_POSITION_INVALID", { values: "bundle | library" });
    }
    const pluginId = identity.pluginId || identity.dirName;
    return {
        dirName: identity.dirName,
        pkgName: identity.pkgName || pluginId,
        pluginId,
        description: identity.description ?? "",
        author: identity.author ?? "",
        pkgPosition,
        ...caps,
    };
}
