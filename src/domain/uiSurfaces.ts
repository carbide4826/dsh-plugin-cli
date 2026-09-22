// UI surface 清单(界面位 → Owner 包 + 槽位 key;label/desc 惰性求值,见 domain/atoms.ts 同款注释)
import { t } from "../locales";

export const UI_SURFACES = [
    {
        id: "settings-card",
        pkg: "@deepseek-ai/dsh-client-ui-settings-plugins",
        label: () => t("domain.ui.settings-card.label"),
        desc: () => t("domain.ui.settings-card.desc"),
        slots: ["settings.plugin.item"],
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
