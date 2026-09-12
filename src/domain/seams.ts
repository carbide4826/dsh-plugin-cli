// 【M1-03】常用缝清单(ctx key → Owner 包)
// 数据快照:官方 deepseek-harness@0.1.5-rc.1 的 docs/capability-seams.md

export const SEAMS = [
    {
        id: "llm",
        ctxKey: "ctx.llm",
        label: "模型接入",
        desc: "注册 LLM 适配器,接入新的模型/供应商",
        pkg: "@deepseek-ai/dsh-llm",
    },
    {
        id: "systemPrompt",
        ctxKey: "ctx.systemPrompt",
        label: "提示注入",
        desc: "往系统提示注册 section(记忆/知识库)",
        pkg: "@deepseek-ai/dsh-system-prompt",
    },
    {
        id: "subagents",
        ctxKey: "ctx.subagents",
        label: "子代理",
        desc: "注册新的子代理提供者",
        pkg: "@deepseek-ai/dsh-subagent",
    },
    {
        id: "web",
        ctxKey: "ctx.web",
        label: "网络提供者",
        desc: "注册搜索/网页抓取提供者",
        pkg: "@deepseek-ai/dsh-web",
    },
    {
        id: "commands",
        ctxKey: "ctx.commands",
        label: "人类命令",
        desc: "注册人类 slash 命令(/goal、/plan 这类,不走模型)",
        pkg: "@deepseek-ai/dsh-commands",
    },
    {
        id: "storage",
        ctxKey: "ctx.storage",
        label: "持久存储",
        desc: "提供持久化存储后端",
        pkg: "@deepseek-ai/dsh-storage",
    },
] as const satisfies readonly {
    id: string;
    ctxKey: string;
    label: string;
    desc: string;
    pkg: string;
}[];

// 缝 id 联合:从数据推导,新增条目自动纳入
export type SeamId = (typeof SEAMS)[number]["id"];
