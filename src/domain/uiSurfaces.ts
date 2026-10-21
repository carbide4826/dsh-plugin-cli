// UI surface 清单(界面位 → Owner 包 + 槽位 key;label/desc 惰性求值,见 domain/atoms.ts 同款注释)
import { t } from "../locales";
import type { AtomId } from "./types";

export const UI_SURFACES = [
    {
        id: "settings-card",
        pkg: "@deepseek-ai/dsh-client-ui-settings-plugins",
        label: () => t("domain.ui.settings-card.label"),
        desc: () => t("domain.ui.settings-card.desc"),
        slots: ["settings.plugins.tab"],
        default: true,
    },
    {
        id: "chat-node",
        pkg: "@deepseek-ai/dsh-client-ui-chat",
        label: () => t("domain.ui.chat-node.label"),
        desc: () => t("domain.ui.chat-node.desc"),
        slots: ["conversation.chat.node"],
    },
    {
        id: "input-dock",
        pkg: "@deepseek-ai/dsh-client-ui-conversation",
        label: () => t("domain.ui.input-dock.label"),
        desc: () => t("domain.ui.input-dock.desc"),
        slots: ["conversation.input.dock", "conversation.composer.bar"],
    },
    {
        id: "sidebar",
        pkg: "@deepseek-ai/dsh-client-ui-sidebar",
        label: () => t("domain.ui.sidebar.label"),
        desc: () => t("domain.ui.sidebar.desc"),
        slots: ["sidebar.panellist"],
    },
    {
        id: "tool-view",
        pkg: "@deepseek-ai/dsh-client-ui-tool",
        label: () => t("domain.ui.tool-view.label"),
        desc: () => t("domain.ui.tool-view.desc"),
        slots: ["tool.call.toolview"],
    },
    {
        id: "session-header",
        pkg: "@deepseek-ai/dsh-client-ui-conversation",
        label: () => t("domain.ui.session-header.label"),
        desc: () => t("domain.ui.session-header.desc"),
        slots: ["conversation.session.header"],
    },
] as const satisfies readonly {
    id: string;
    pkg: string;
    label: () => string;
    desc: () => string;
    slots: readonly string[];
    default?: true;
}[];

export type UISurfaceId = (typeof UI_SURFACES)[number]["id"];

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
