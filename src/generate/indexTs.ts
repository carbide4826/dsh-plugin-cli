import type { Answers } from "../domain/types";
import type { TrackManifest } from "../domain/manifests";
import type { AggregatePlan } from "../atoms";
import { t } from "../locales";

interface IndexBlock {
    injects: string[];
    imports: string[];
    calls: string[];
}

function configDeclaration(): string[] {
    return [
        "/** 插件配置(样例:把 example 换成你的配置项)。 */",
        "export interface Config {",
        "    /** TODO: 配置项说明 */",
        "    example: string",
        "}",
        "",
        "// .volatile():字段进宿主原生配置表单(0.1.7 起宿主投影 Config schema,仅 volatile 字段可编辑)",
        "export const Config: z<Config> = z.object({",
        "    example: z.string().required().volatile(),",
        "})",
    ];
}

/**
 * 生成顶层插件入口 src/index.ts
 * @param answers - 完整问卷答案
 * @param index - 生成计划里的 index 拼装行
 * @param manifest - 目标轨 manifest(0.1.7 起动态配置由宿主原生表单承担)
 * @returns 文件内容
 */
export function generateHostIndex(
    answers: Answers,
    index: IndexBlock,
    manifest: TrackManifest,
): string {
    const dynamic = answers.config === "dynamic";
    // 0.1.5 的 installSection 注册式动态配置在 0.1.7 已移除:Config schema 由宿主
    // 原生投影成表单(SettingsForms),编辑保存后宿主以新配置重跑 apply。故 next 轨
    // 的 dynamic 退化为与 static 相同的入口形态(注释里说明热更新来源)。
    const legacyDynamic = dynamic && manifest.target === "latest";
    const lines: string[] = [];

    lines.push(`// ${answers.pkgName} — 插件入口(由 dshp 生成)。`);
    lines.push("import type { Context } from '@deepseek-ai/cordis'");
    if (answers.config !== "none") {
        lines.push("import z from '@deepseek-ai/schemastery'");
    }
    if (legacyDynamic) {
        lines.push(
            "import type {} from '@deepseek-ai/dsh-settings' // ctx.settings 的类型来源(动态配置)",
        );
    }
    for (const imp of index.imports) lines.push(imp);

    lines.push("");
    lines.push("// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)");
    lines.push(`export const name = '${answers.pluginId}'`);

    if (index.injects.length > 0 || legacyDynamic) {
        // 动态配置要用 ctx.settings,inject 并入 settings(加载顺序)
        const injects = legacyDynamic
            ? [...index.injects, "settings"]
            : index.injects;
        lines.push("");
        lines.push("// 要求就绪的服务(决定加载顺序)");
        lines.push(
            `export const inject = [${injects.map((s) => `'${s}'`).join(", ")}]`,
        );
    }

    if (answers.config !== "none") {
        lines.push("");
        lines.push(...configDeclaration());
    }

    lines.push("");
    lines.push("/**");
    lines.push(" * 插件入口:各能力的注册调用(由 dshp 生成)。");
    lines.push(" * @param ctx - Cordis 上下文");
    if (answers.config !== "none")
        lines.push(" * @param config - 已解析的插件配置");
    lines.push(" */");
    if (answers.config === "none") {
        lines.push("export function apply(ctx: Context): void {");
    } else {
        lines.push(
            "export function apply(ctx: Context, config: Config): void {",
        );
    }
    if (index.calls.length === 0) {
        lines.push("    // 纯工程骨架:未勾选任何原子;按需在此自行注册");
        lines.push("    void ctx");
    } else {
        for (const call of index.calls) lines.push(`    ${call}`);
        if (answers.config !== "none")
            lines.push("    void config // TODO: 把配置接进你的实现");
    }
    if (legacyDynamic) {
        lines.push(
            "    // 动态配置:注册 settings section;部署侧 provider(dsh-settings-file)变更时热更新",
        );
        lines.push("    let getSource: () => Config = () => config");
        lines.push(
            "    ctx.settings.installSection(ctx, '" +
                answers.pluginId +
                "', Config, config, {",
        );
        lines.push("        setSource: (source) => {");
        lines.push("            getSource = source");
        lines.push("        },");
        lines.push("        onChange: () => {");
        lines.push("            const current = getSource()");
        lines.push(
            "            void current // TODO: 响应配置变化(如热更新 API key)",
        );
        lines.push("        },");
        lines.push("    })");
    } else if (dynamic) {
        lines.push(
            "    // 动态配置(0.1.7):Config schema 由宿主原生投影成设置页表单,",
        );
        lines.push(
            "    // 编辑保存后宿主以新配置重跑 apply——在 apply 里消费 config 即热更新。",
        );
        lines.push("    void config // TODO: 把配置接进你的实现");
    }
    lines.push("}");
    return lines.join("\n") + "\n";
}

/**
 * 生成聚合文件(events.ts / seams/index.ts / client/index.ts,骨架按文件路径区分)
 * @param aggregate - 生成计划里的聚合条目
 * @returns 文件内容
 */
export function generateAggregator(aggregate: AggregatePlan): string {
    const body = (fallback: string): string[] =>
        aggregate.calls.length > 0
            ? aggregate.calls.map((c) => `    ${c}`)
            : [`    ${fallback}`];

    if (aggregate.file === "src/events.ts") {
        return (
            [
                "// 事件域聚合入口(由 dshp 生成):每域一行调用,实现见 ./domains/*.ts。",
                "import type { Context } from '@deepseek-ai/cordis'",
                ...aggregate.imports,
                "",
                "/**",
                " * 注册已选事件域的监听。",
                " * @param ctx - Cordis 上下文",
                " */",
                "export function registerEventListeners(ctx: Context): void {",
                ...body("// 未勾选任何事件域;按需在此补 ctx.on(...)"),
                "}",
            ].join("\n") + "\n"
        );
    }

    if (aggregate.file === "src/seams/index.ts") {
        return (
            [
                "// 能力缝聚合入口(由 dshp 生成):每缝一行调用,实现见同目录 *.ts。",
                "// 各缝要求的服务就绪已并入插件入口的 inject。",
                "import type { Context } from '@deepseek-ai/cordis'",
                ...aggregate.imports,
                "",
                "/**",
                " * 注册已选能力缝。",
                " * @param ctx - Cordis 上下文",
                " */",
                "export function registerServiceSeams(ctx: Context): void {",
                ...body("// 未勾选任何能力缝;按需在此补注册调用"),
                "}",
            ].join("\n") + "\n"
        );
    }

    if (aggregate.file === "src/client/index.ts") {
        return (
            [
                "// client 侧聚合入口(由 dshp 生成):每界面位一行调用,实现见 ./surfaces/(注册层 .ts + 组件层 .tsx)。",
                "// renderer/client 是 ctx.slots 的类型来源(官方同款集中引入)。",
                "import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'",
                "import type { Context } from '@deepseek-ai/cordis'",
                ...aggregate.imports,
                "",
                "// client 侧服务:槽位注册必需",
                "export const inject = ['slots']",
                "",
                "/**",
                " * 注册已选界面位。",
                " * @param ctx - client 根上下文",
                " */",
                "export function apply(ctx: Context): void {",
                ...body("// 未勾选任何界面位;按需在此补槽位注册"),
                "}",
            ].join("\n") + "\n"
        );
    }

    throw new Error(t("errors.unknownAggregate", { file: aggregate.file }));
}
