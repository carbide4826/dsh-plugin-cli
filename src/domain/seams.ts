// 【M1-03】常用缝清单(ctx key → 相关包)
// 数据快照:官方 deepseek-harness@0.1.5-rc.1 的 docs/capability-seams.md

export const SEAMS = [
    {
        id: "llm",
        ctxKey: "ctx.llm",
        label: "模型接入(llm)",
        desc: "注册 LLM 适配器,接入新的模型/供应商",
        pkgs: [
            "@deepseek-ai/dsh-llm", // 定义包
            "@deepseek-ai/dsh-llm-pi-ai", // 官方实现:pi-ai 多供应商
            "@deepseek-ai/dsh-llm-deepseek", // 官方实现:DeepSeek 官方 API
        ],
    },
    {
        id: "systemPrompt",
        ctxKey: "ctx.systemPrompt",
        label: "提示注入(systemPrompt)",
        desc: "往系统提示注册 section(记忆/知识库)",
        pkgs: ["@deepseek-ai/dsh-system-prompt"],
    },
    {
        id: "subagents",
        ctxKey: "ctx.subagents",
        label: "子代理(subagents)",
        desc: "注册新的子代理提供者",
        pkgs: ["@deepseek-ai/dsh-subagent"],
    },
    {
        id: "web",
        ctxKey: "ctx.web",
        label: "网络提供者(web)",
        desc: "注册搜索/网页抓取提供者",
        pkgs: [
            "@deepseek-ai/dsh-web", // 定义包
            "@deepseek-ai/dsh-web-fetch-http", // 官方实现:HTTP 抓取
        ],
    },
    {
        id: "commands",
        ctxKey: "ctx.commands",
        label: "人类命令(commands)",
        desc: "注册人类 slash 命令(/goal、/plan 这类,不走模型)",
        pkgs: ["@deepseek-ai/dsh-commands"],
    },
    {
        id: "storage",
        ctxKey: "ctx.storage",
        label: "持久存储(storage)",
        desc: "提供持久化存储后端",
        pkgs: [
            "@deepseek-ai/dsh-storage", // 定义包
            "@deepseek-ai/dsh-storage-json", // 官方实现:JSON 后端
            "@deepseek-ai/dsh-storage-sqlite", // 官方实现:SQLite 后端
        ],
    },
] as const satisfies readonly {
    id: string;
    ctxKey: string;
    label: string;
    desc: string;
    pkgs: readonly string[];
}[];

// 缝 id 联合:从数据推导,新增条目自动纳入
export type SeamId = (typeof SEAMS)[number]["id"];
