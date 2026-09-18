// 事件域清单
export const EVENT_DOMAINS = [
    {
        id: "tools",
        label: "工具执行",
        desc: "工具执行的拦截、变换与观察:权限门、审计、指标",
        pkgs: ["@deepseek-ai/dsh-tools"],
        default: true,
        events: [
            { id: "tools/pre-execute", mode: "waterfall" },
            { id: "tools/execute", mode: "waterfall" },
            { id: "tools/post-execute", mode: "waterfall" },
            { id: "tools/result", mode: "emit" },
            { id: "tools/change", mode: "emit" },
            { id: "tools/ptc-dispatch-log", mode: "waterfall" },
        ],
    },
    {
        id: "agent",
        label: "agent 生命周期",
        desc: "agent 循环钩子:会话启动、步前、请求、轮停、错误",
        pkgs: ["@deepseek-ai/dsh-agent", "@deepseek-ai/dsh-agent-loop"],
        events: [
            { id: "agent/session-start", mode: "emit" },
            { id: "agent/pre-step", mode: "waterfall" },
            { id: "agent/request", mode: "waterfall" },
            { id: "agent/request-error", mode: "waterfall" },
            { id: "agent/turn-stopping", mode: "serial" },
            { id: "agent/status", mode: "emit" },
            { id: "agent/error", mode: "emit" },
        ],
    },
    {
        id: "session",
        label: "会话事件流",
        desc: "会话创建、销毁与事件订阅",
        pkgs: ["@deepseek-ai/dsh-session"],
        events: [
            { id: "session/event", mode: "emit" },
            { id: "session/created", mode: "emit" },
            { id: "session/disposed", mode: "emit" },
            { id: "session/flush", mode: "parallel" },
        ],
    },
    {
        id: "approval",
        label: "审批流",
        desc: "审批请求瀑布:自定义审批 UI、审计记录",
        pkgs: ["@deepseek-ai/dsh-user-approval"],
        events: [{ id: "approval/request", mode: "waterfall" }],
    },
    {
        id: "fs",
        label: "文件观察",
        desc: "文件系统状态变化(自动格式化/同步类插件)",
        pkgs: ["@deepseek-ai/dsh-fs", "@deepseek-ai/dsh-tool-fs"],
        events: [
            { id: "fs/observed", mode: "emit" },
            { id: "fs/write-intent", mode: "waterfall" },
            { id: "fs/edit-intent", mode: "waterfall" },
        ],
    },
    {
        id: "settings",
        label: "设置变更",
        desc: "用户修改设置时的通知(响应式配置)",
        pkgs: ["@deepseek-ai/dsh-settings", "@deepseek-ai/dsh-settings-file"],
        events: [
            { id: "settings/updated", mode: "emit" },
            { id: "settings/document-updated", mode: "emit" },
        ],
    },
] as const satisfies readonly {
    id: string;
    label: string;
    desc: string;
    pkgs: readonly string[];
    default?: boolean;
    events: readonly {
        id: string;
        mode: "emit" | "waterfall" | "serial" | "parallel";
    }[];
}[];

export type EventDomainId = (typeof EVENT_DOMAINS)[number]["id"];
