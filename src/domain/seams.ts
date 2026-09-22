// 常用缝清单(ctx key → 相关包;label/desc 惰性求值,见 domain/atoms.ts 同款注释)
import { t } from "../locales";

export const SEAMS = [
    {
        id: "llm",
        ctxKey: "ctx.llm",
        inject: "llm",
        label: () => t("domain.seams.llm.label"),
        desc: () => t("domain.seams.llm.desc"),
        pkgs: [
            "@deepseek-ai/dsh-llm", // 定义包
            "@deepseek-ai/dsh-llm-pi-ai", // 官方实现:pi-ai 多供应商
            "@deepseek-ai/dsh-llm-deepseek", // 官方实现:DeepSeek 官方 API
        ],
    },
    {
        id: "systemPrompt",
        ctxKey: "ctx.systemPrompt",
        inject: "systemPrompt",
        label: () => t("domain.seams.systemPrompt.label"),
        desc: () => t("domain.seams.systemPrompt.desc"),
        pkgs: ["@deepseek-ai/dsh-system-prompt"],
    },
    {
        id: "subagents",
        ctxKey: "ctx.subagents",
        inject: "subagents",
        label: () => t("domain.seams.subagents.label"),
        desc: () => t("domain.seams.subagents.desc"),
        pkgs: ["@deepseek-ai/dsh-subagent"],
    },
    {
        id: "web",
        ctxKey: "ctx.web",
        inject: "web",
        label: () => t("domain.seams.web.label"),
        desc: () => t("domain.seams.web.desc"),
        pkgs: [
            "@deepseek-ai/dsh-web", // 定义包
            "@deepseek-ai/dsh-web-fetch-http", // 官方实现:HTTP 抓取
        ],
    },
    {
        id: "commands",
        ctxKey: "ctx.commands",
        inject: "commands",
        label: () => t("domain.seams.commands.label"),
        desc: () => t("domain.seams.commands.desc"),
        pkgs: ["@deepseek-ai/dsh-commands"],
    },
    {
        id: "storage",
        ctxKey: "ctx.storage",
        inject: "storage",
        label: () => t("domain.seams.storage.label"),
        desc: () => t("domain.seams.storage.desc"),
        pkgs: [
            "@deepseek-ai/dsh-storage", // 定义包
            "@deepseek-ai/dsh-storage-json", // 官方实现:JSON 后端
            "@deepseek-ai/dsh-storage-sqlite", // 官方实现:SQLite 后端
        ],
    },
] as const satisfies readonly {
    id: string;
    ctxKey: string;
    /** 该缝要求的就绪服务名(生成器并入插件入口 inject 并集) */
    inject: string;
    label: () => string;
    desc: () => string;
    pkgs: readonly string[];
}[];

export type SeamId = (typeof SEAMS)[number]["id"];
