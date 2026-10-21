// dshp_create_plugin:生成插件项目(预设 / 精选案例 / 自由组合三条路径)
//
// 写盘策略:dryRun 缺省为 true —— 第一次调用只算计划(返回将生成哪些文件),
// 模型看清后再显式传 dryRun:false 写盘。这既是 MCP 侧的「显式确认后写盘」,
// 也让模型有机会在落盘前发现参数选错(比如界面位少了依赖原子)。
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createFromSpec, type CreateSpec } from "../../core/create";
import { createPluginInputShape } from "../schema";
import { errResult, okResult } from "../result";
import { withLang } from "../../locales";

/** tool 入参(MCP schema 派生出来的形状) */
interface CreateArgs {
    mode: "preset" | "case" | "free";
    dirName?: string;
    preset?: string;
    case?: string;
    atoms?: string[];
    eventDomains?: string[];
    uiSurfaces?: string[];
    serviceSeams?: string[];
    newService?: boolean;
    config?: string;
    target?: string;
    pkgName?: string;
    pluginId?: string;
    toolName?: string;
    description?: string;
    author?: string;
    pkgPosition?: string;
    dryRun?: boolean;
    lang?: "zh" | "en";
}

/** MCP 入参 → 内部生成规格(字段一一对应,模式决定哪些生效) */
function toSpec(args: CreateArgs): CreateSpec {
    return {
        mode: args.mode,
        dirName: args.dirName,
        preset: args.preset,
        case: args.case,
        atoms: args.atoms,
        eventDomains: args.eventDomains,
        uiSurfaces: args.uiSurfaces,
        serviceSeams: args.serviceSeams,
        newService: args.newService,
        config: args.config,
        target: args.target,
        pkgName: args.pkgName,
        pluginId: args.pluginId,
        toolName: args.toolName,
        description: args.description,
        author: args.author,
        pkgPosition: args.pkgPosition,
    };
}

export function registerCreatePlugin(
    server: McpServer,
    options: { baseDir?: string } = {},
): void {
    server.registerTool(
        "dshp_create_plugin",
        {
            title: "Create DSH plugin project",
            description:
                "生成 DeepSeek Harness 插件项目骨架。三种模式:preset(预设组合,能力锁定)、" +
                "case(精选案例,整目录拷贝)、free(自由组合,逐项选能力)。" +
                "缺省只算计划不落盘(dryRun=true):第一次调用看清将生成哪些文件," +
                "确认后显式传 dryRun=false 写盘。生成后需在项目目录里跑 pnpm install → typecheck → build," +
                "再用 pnpm dsh web --patch ./dev.patch.yml 起宿主。",
            inputSchema: createPluginInputShape(),
            annotations: {
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false,
            },
        },
        async (args: CreateArgs) => {
            try {
                // 写盘只认显式的 dryRun:false(缺省 true = 只算计划)
                const write = args.dryRun === false;
                // 语言按调用指定:宿主 spawn 子进程时通常不继承 LANG,环境探测拿不到用户语言
                const run = () =>
                    createFromSpec(
                        toSpec(args),
                        write,
                        options.baseDir ?? process.cwd(),
                    );
                const result = args.lang ? withLang(args.lang, run) : run();
                return okResult({
                    ok: true,
                    mode: result.mode,
                    written: result.written,
                    dirName: result.dirName,
                    targetDir: result.targetDir,
                    files: result.files,
                    nextSteps: result.nextSteps,
                    // preset/free 有解析出的完整能力组合(case 模式没有问卷,故为 null)
                    resolved: result.answers ?? null,
                    hint: result.written
                        ? "已落盘。接下来在目标目录跑 nextSteps 里的命令。"
                        : "这只是计划(未落盘)。确认无误后用同样的参数再调一次并传 dryRun=false。",
                });
            } catch (err) {
                return errResult(err);
            }
        },
    );
}
