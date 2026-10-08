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
const SURFACE_REQUIRES = {
    "settings-card": [],
    "chat-node": [],
    "input-dock": [],
    sidebar: [],
    "tool-view": ["tool"],
    "session-header": [],
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
