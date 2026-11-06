// UI surface 清单(界面位 → Owner 包 + 槽位 key;label/desc 惰性求值,见 domain/atoms.ts 同款注释)
//
// 轨分叉:槽位键是宿主契约 —— 宿主在某个版本才引入的键,老宿主没有它,
// 选到就注册不上(静默不渲染)。0.2.1-rc.4 起宿主才有「更多菜单」那三个
// actions 槽位,所以它们只在 next 轨可选;tracks 标出每个界面位的可用轨。
import { t } from "../locales";
import type { AtomId } from "./types";
import type { TrackTarget } from "./manifests/track";

export interface UISurfaceDef {
    readonly id: string;
    readonly pkg: string;
    readonly label: () => string;
    readonly desc: () => string;
    readonly slots: readonly string[];
    readonly default?: true;
    /** 可用轨:宿主版本才引入的槽位只在该版本对应的轨可选 */
    readonly tracks: readonly TrackTarget[];
    /** 该界面位额外需要的宿主包(如菜单行组件来自 ui-primitives) */
    readonly extraPkgs?: readonly string[];
    /**
     * 其中必须在打包时 external 的宿主包。
     * 宿主把一批 UI 包放进冻结的 module table(见官方 packages/client/web/src/platform.ts 的
     * PLATFORM_MODULES),插件运行时从那张表里取它们;打包时若内联,内联的副本与宿主那份
     * 不是同一个模块身份(如 ui-primitives 内部持有 store 状态)⇒ 双实例。
     */
    readonly externalPkgs?: readonly string[];
}

const UI_SURFACE_DEFS = [
    {
        id: "settings-card",
        pkg: "@deepseek-ai/dsh-client-ui-settings-plugins",
        label: () => t("domain.ui.settings-card.label"),
        desc: () => t("domain.ui.settings-card.desc"),
        slots: ["settings.plugins.tab"],
        default: true,
        tracks: ["latest", "next"],
    },
    {
        id: "chat-node",
        pkg: "@deepseek-ai/dsh-client-ui-chat",
        label: () => t("domain.ui.chat-node.label"),
        desc: () => t("domain.ui.chat-node.desc"),
        slots: ["conversation.chat.node"],
        tracks: ["latest", "next"],
    },
    {
        id: "input-dock",
        pkg: "@deepseek-ai/dsh-client-ui-conversation",
        label: () => t("domain.ui.input-dock.label"),
        desc: () => t("domain.ui.input-dock.desc"),
        slots: ["conversation.input.dock", "conversation.composer.bar"],
        tracks: ["latest", "next"],
    },
    {
        id: "sidebar",
        pkg: "@deepseek-ai/dsh-client-ui-sidebar",
        label: () => t("domain.ui.sidebar.label"),
        desc: () => t("domain.ui.sidebar.desc"),
        slots: ["sidebar.panellist"],
        tracks: ["latest", "next"],
    },
    {
        id: "tool-view",
        pkg: "@deepseek-ai/dsh-client-ui-tool",
        label: () => t("domain.ui.tool-view.label"),
        desc: () => t("domain.ui.tool-view.desc"),
        slots: ["tool.call.toolview"],
        tracks: ["latest", "next"],
    },
    {
        id: "session-header",
        pkg: "@deepseek-ai/dsh-client-ui-conversation",
        label: () => t("domain.ui.session-header.label"),
        desc: () => t("domain.ui.session-header.desc"),
        slots: ["conversation.session.header"],
        tracks: ["latest", "next"],
    },
    // ── 以下三个是 0.2.1-rc.4 起才有的「更多菜单」槽位,只在 next 轨可选 ──
    {
        id: "sidebar-actions",
        pkg: "@deepseek-ai/dsh-client-ui-sidebar",
        label: () => t("domain.ui.sidebar-actions.label"),
        desc: () => t("domain.ui.sidebar-actions.desc"),
        slots: ["sidebar.panellist.actions"],
        tracks: ["next"],
        extraPkgs: ["@deepseek-ai/dsh-client-ui-primitives"],
        externalPkgs: ["@deepseek-ai/dsh-client-ui-primitives"],
    },
    {
        id: "session-views-actions",
        pkg: "@deepseek-ai/dsh-client-ui-conversation",
        label: () => t("domain.ui.session-views-actions.label"),
        desc: () => t("domain.ui.session-views-actions.desc"),
        slots: ["conversation.session.header.views.actions"],
        tracks: ["next"],
        extraPkgs: ["@deepseek-ai/dsh-client-ui-primitives"],
        externalPkgs: ["@deepseek-ai/dsh-client-ui-primitives"],
    },
    {
        id: "right-guide-actions",
        pkg: "@deepseek-ai/dsh-client-ui-sidebar-right",
        label: () => t("domain.ui.right-guide-actions.label"),
        desc: () => t("domain.ui.right-guide-actions.desc"),
        slots: ["sidebar.right.tab.guide.actions"],
        tracks: ["next"],
        extraPkgs: ["@deepseek-ai/dsh-client-ui-primitives"],
        externalPkgs: ["@deepseek-ai/dsh-client-ui-primitives"],
    },
] as const satisfies readonly UISurfaceDef[];

export type UISurfaceId = (typeof UI_SURFACE_DEFS)[number]["id"];

/** 全部界面位(两轨并集):机器可读清单用,逐项带 tracks 说明在哪些轨可用 */
export const UI_SURFACES = UI_SURFACE_DEFS;

/**
 * 按轨取界面位清单(生成路径必须走这里:某轨不可用的界面位不能出现在问卷/参数校验里,
 * 否则会生成注册到不存在槽位的哑界面)。
 * @param target - 目标轨
 * @returns 该轨可选的界面位
 */
export function uiSurfacesFor(
    target: TrackTarget,
): readonly (typeof UI_SURFACE_DEFS)[number][] {
    return UI_SURFACE_DEFS.filter((s) =>
        (s.tracks as readonly TrackTarget[]).includes(target),
    );
}

/**
 * 收集必须 external 的宿主包(去重排序):宿主冻结的 module table 提供它们,
 * 打包时内联会与宿主那份不是同一模块身份 ⇒ 双实例。
 * @param target - 目标轨
 * @param picked - 已勾界面位 id
 * @returns 该组合下必须 external 的宿主包
 */
export function surfaceExternalPkgs(
    target: TrackTarget,
    picked: readonly string[],
): readonly string[] {
    const out = new Set<string>();
    for (const surface of uiSurfacesFor(target)) {
        if (!picked.includes(surface.id)) continue;
        for (const pkg of "externalPkgs" in surface ? surface.externalPkgs : []) {
            out.add(pkg);
        }
    }
    return [...out].sort();
}

// 界面位 → 必须同勾的原子(缺了就没有可挂的注册键,生成出静默不渲染的哑界面)。
// satisfies 全键约束:新增界面位必须在这里登记依赖(没有就填空数组)
// 导出:机器可读清单(core/describe.ts)要用它 —— 界面位与原子的依赖关系是
// 「能选什么」的一部分,模型选界面位时必须一并知道,否则会挑出哑界面。
export const SURFACE_REQUIRES = {
    // 全部界面位都要 ui 原子:界面位实现文件与 client 聚合入口由 ui 原子产出,
    // 缺 ui 原子 ⇒ 界面位选择被静默丢弃(生成物里根本没有 client/,界面位一个都不渲染)。
    // 交互问卷里界面位多选只在勾了 ui 原子时才问,所以这条约束在交互路径上天然成立;
    // 自由组合路径(命令行 / MCP)能绕过,故必须在表里登记。
    "settings-card": ["ui"],
    "chat-node": ["ui"],
    "input-dock": ["ui"],
    sidebar: ["ui"],
    // tool-view 额外要 tool 原子:它渲染的是工具调用,没有工具就没有可渲染的东西
    "tool-view": ["ui", "tool"],
    "session-header": ["ui"],
    // 三个「更多菜单」界面位:同 ui 原子依赖(注册代码在 client 聚合入口里)
    "sidebar-actions": ["ui"],
    "session-views-actions": ["ui"],
    "right-guide-actions": ["ui"],
} as const satisfies Record<UISurfaceId, readonly AtomId[]>;

/**
 * 找出「已勾界面位里依赖未满足」的条目(界面位 requires 声明的原子必须同勾)。
 * @param picked - 已勾界面位 id
 * @param atoms - 已勾原子 id
 * @returns 依赖未满足的界面位 id 与其缺失的原子
 */
export function unsatisfiedSurfaces(
    picked: readonly string[],
    atoms: readonly AtomId[],
): { id: string; requires: readonly AtomId[] }[] {
    return (Object.entries(SURFACE_REQUIRES) as [string, readonly AtomId[]][])
        .filter(([id, requires]) => picked.includes(id))
        .map(([id, requires]) => ({
            id,
            requires: requires.filter((a) => !atoms.includes(a)),
        }))
        .filter((x) => x.requires.length > 0);
}
