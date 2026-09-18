// UI surface 清单(界面位 → Owner 包 + 槽位 key)
export const UI_SURFACES = [
    {
        id: "settings-card",
        pkg: "@deepseek-ai/dsh-client-ui-settings-plugins",
        label: "设置卡片",
        desc: "在设置页展示/编辑插件配置(动态配置时自动配对)",
        slots: ["settings.plugin.item"],
        default: true,
    },
    {
        id: "chat-node",
        pkg: "@deepseek-ai/dsh-client-ui-chat",
        label: "会话节点",
        desc: "往对话流插入自定义业务节点渲染",
        slots: ["conversation.chat.node"],
    },
    {
        id: "input-dock",
        pkg: "@deepseek-ai/dsh-client-ui-conversation",
        label: "输入区 dock",
        desc: "输入框上方的挂件条(GoalBar 同款位置)",
        slots: ["conversation.input.dock", "conversation.composer.bar"],
    },
    {
        id: "sidebar",
        pkg: "@deepseek-ai/dsh-client-ui-sidebar",
        label: "侧边栏",
        desc: "左侧面板区块",
        slots: ["sidebar.panellist"],
    },
    {
        id: "tool-view",
        pkg: "@deepseek-ai/dsh-client-ui-tool",
        label: "工具调用视图",
        desc: "自定义工具调用的展示样式(配合 Tool)",
        slots: ["tool.call.toolview"],
    },
    {
        id: "session-header",
        pkg: "@deepseek-ai/dsh-client-ui-conversation",
        label: "会话头",
        desc: "会话头部动作/角标扩展",
        slots: ["conversation.session.header"],
    },
] as const satisfies readonly {
    id: string;
    pkg: string;
    label: string;
    desc: string;
    slots: readonly string[];
    default?: boolean;
}[];

export type UISurfaceId = (typeof UI_SURFACES)[number]["id"];
