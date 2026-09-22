// 事件域清单(label/desc 惰性求值,见 domain/atoms.ts 同款注释)
import { t } from "../locales";

export const EVENT_DOMAINS = [
    {
        id: "tools",
        label: () => t("domain.events.tools.label"),
        desc: () => t("domain.events.tools.desc"),
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
        label: () => t("domain.events.agent.label"),
        desc: () => t("domain.events.agent.desc"),
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
        label: () => t("domain.events.session.label"),
        desc: () => t("domain.events.session.desc"),
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
        label: () => t("domain.events.approval.label"),
        desc: () => t("domain.events.approval.desc"),
        pkgs: ["@deepseek-ai/dsh-user-approval"],
        events: [{ id: "approval/request", mode: "waterfall" }],
    },
    {
        id: "fs",
        label: () => t("domain.events.fs.label"),
        desc: () => t("domain.events.fs.desc"),
        pkgs: ["@deepseek-ai/dsh-fs", "@deepseek-ai/dsh-tool-fs"],
        events: [
            { id: "fs/observed", mode: "emit" },
            { id: "fs/write-intent", mode: "waterfall" },
            { id: "fs/edit-intent", mode: "waterfall" },
        ],
    },
    {
        id: "settings",
        label: () => t("domain.events.settings.label"),
        desc: () => t("domain.events.settings.desc"),
        pkgs: ["@deepseek-ai/dsh-settings", "@deepseek-ai/dsh-settings-file"],
        events: [
            { id: "settings/updated", mode: "emit" },
            { id: "settings/document-updated", mode: "emit" },
        ],
    },
] as const satisfies readonly {
    id: string;
    label: () => string;
    desc: () => string;
    pkgs: readonly string[];
    default?: true;
    events: readonly {
        id: string;
        mode: "emit" | "waterfall" | "serial" | "parallel";
    }[];
}[];

export type EventDomainId = (typeof EVENT_DOMAINS)[number]["id"];
