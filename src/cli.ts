#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import type { Answers } from "./domain/types";
import { buildScenarioAnswers, findScenario, SCENARIOS } from "./domain/scenarios";
import {
    askDirectoryName,
    askPkgName,
    askPluginId,
    askPkgPosition,
    askProjectMeta,
} from "./prompts/basic";
import { askCapabilities } from "./prompts/capabilities";
import { askConfig } from "./prompts/config";
import { printSummary } from "./prompts/summary";
import { writeProject } from "./generate/project";
import { copyScenarioCase, listScenarioCases } from "./generate/scenarioCase";
import pkgJson from "../package.json" with { type: "json" };

const program = new Command();

// 生成完成后的统一提示(交互与非交互两条路径共用,避免文案漂移);单命令单行,目录名动态传入
function nextSteps(dirName: string): string {
    return [
        `cd ${dirName}`,
        "pnpm install",
        "pnpm typecheck",
        "pnpm build",
        "pnpm dsh web --patch ./dev.patch.yml",
    ].join("\n");
}

// 报错提示用的场景 id 清单(如 "tool, llm, ui, events, protocol")
const SCENARIO_IDS = SCENARIOS.map((s) => s.id).join(", ");

// 精选案例的一句话描述(交互与 --help 案例一览共用文案)
const CASE_HINTS: Record<string, string> = {
    "quick-tool": "查询工具+结果卡片",
    "model-gateway": "自有模型网关+动态设置",
    "session-bot": "会话自动响应",
    "webhook-bridge": "外部事件桥接",
    notebook: "用户数据存取",
};

// create 命令的选项集合(--template 模式下的覆盖参数,均可在缺省时回落预设)
interface CreateOptions {
    template?: string;
    scenario?: boolean;
    pkgName?: string;
    pluginId?: string;
    toolName?: string;
    description?: string;
    author?: string;
    pkgPosition?: string;
    config?: string;
}

// 覆盖类参数清单(用于"未配合 --template 时"的误用提醒)
const OVERRIDE_KEYS = [
    "pkgName",
    "pluginId",
    "toolName",
    "description",
    "author",
    "pkgPosition",
    "config",
] as const satisfies readonly (keyof CreateOptions)[];

// 精选案例(-s)模式下不适用的覆盖参数:生成结构随案例锁定
// (身份/元信息类 --pkg-name/--plugin-id/--description/--author 均生效)
const CASE_INAPPLICABLE_FLAGS: Partial<Record<keyof CreateOptions, string>> = {
    toolName: "--tool-name",
    pkgPosition: "--pkg-position",
    config: "--config",
};

program
    .name("dshp")
    .description(
        "Scaffold DeepSeek Harness (dsh) plugin projects interactively",
    )
    .version(pkgJson.version);

program
    .command("create [name]")
    .description("Create a DSH plugin project skeleton")
    .option(
        "--template <source>",
        "preset scenario (default) or curated case id with -s; non-interactive",
    )
    .option(
        "-s, --scenario",
        "take the template from the curated case library (templates/scenarios) instead of the preset pipeline",
    )
    .option("--pkg-name <name>", "override npm package name (default: derived from plugin id; plugin id defaults to dir name)")
    .option("--plugin-id <id>", "override plugin id (default: derived from dir name)")
    .option("--tool-name <name>", "override tool name (for the tool scenario)")
    .option("--description <text>", "override description (default: scenario preset; with -s, replaces the case description)")
    .option("--author <name>", "override author")
    .option("--pkg-position <position>", "package position: bundle | library (default: bundle)")
    .option("--config <mode>", "config mode: none | static | dynamic (default: scenario preset)")
    .addHelpText(
        "after",
        `
Scenario quick-start (--template has two sources, switch with -s):

1) Preset combination (default):
   dshp create <name> --template <preset>
   dshp create --template <preset>

   Presets:
     tool       Tool example (tool atom, toolName=example_tool)
     llm        LLM service example (service + llm seam)
     ui         UI example (settings-card, static config)
     events     Event listener example (session domain)
     protocol   HTTP protocol example (protocol atom)

2) Curated cases (-s):
   dshp create <name> --template <case> -s

   Cases:
     quick-tool      Custom query tool + result card (tool + tool-view)
     model-gateway   Bring your own model gateway (llm seam + dynamic settings card)
     session-bot     Auto-respond in sessions (events + llm seam)
     webhook-bridge  Bridge external events into sessions (protocol + events)
     notebook        Per-user notes (storage seam + tool)

Overridable fields:
  --pkg-name <name>          npm package name
  --plugin-id <id>           plugin id
  --tool-name <name>         tool name (tool scenario)
  --description <text>       description
  --author <name>            author
  --pkg-position <position>  bundle | library
  --config <mode>            none | static | dynamic

------------------------------------------------------------

场景快捷生成(--template 有两个来源,用 -s 区分):

1) 预设组合(默认):
   dshp create <name> --template <preset>
   dshp create --template <preset>

   预设一览:
     tool       工具示例(tool 原子,toolName=example_tool)
     llm        LLM 服务示例(service + llm 缝)
     ui         界面示例(settings-card,静态配置)
     events     事件监听示例(session 域)
     protocol   HTTP 协议示例(protocol 原子)

2) 精选案例(-s):
   dshp create <name> --template <case> -s

   案例:
     quick-tool      自定义查询工具 + 结果卡片(tool + tool-view)
     model-gateway   接入自有模型服务(llm 缝 + 设置卡片动态配置)
     session-bot     监听会话自动响应(events + llm 缝)
     webhook-bridge  外部事件桥接进会话(protocol + events)
     notebook        用户数据存取(storage 缝 + tool)

参数配置:
  --pkg-name <name>          npm 包名
  --plugin-id <id>           插件 id
  --tool-name <name>         工具名(tool 场景)
  --description <text>       描述
  --author <name>            作者
  --pkg-position <position>  bundle | library
  --config <mode>            none | static | dynamic
`,
    )
    .action(async (name: string | undefined, options: CreateOptions) => {
        // -s 精选案例路径:从 templates/scenarios/ 整目录拷贝并重写身份(所见即所得)
        if (options.scenario && !options.template) {
            p.log.error("--scenario(-s)需与 --template <案例id> 搭配使用(详见 dshp create --help)");
            process.exitCode = 1;
            return;
        }

        // --template 场景快捷入口:非交互一行命令,能力组合由场景预设锁定,
        // 其余字段可被命令行参数覆盖(传了用传的,没传回落预设)
        if (options.template) {
            if (options.scenario) {
                const cases = listScenarioCases();
                if (!cases.includes(options.template)) {
                    p.log.error(
                        `案例 "${options.template}" 不存在。可用案例:${cases.join(", ")}(详见 dshp create --help)`,
                    );
                    process.exitCode = 1;
                    return;
                }
                const inapplicable = Object.entries(CASE_INAPPLICABLE_FLAGS)
                    .filter(([k]) => options[k as keyof CreateOptions] !== undefined)
                    .map(([, flag]) => flag ?? "");
                if (inapplicable.length > 0) {
                    p.log.warn(
                        `精选案例所见即所得,以下覆盖参数不适用,已忽略:${inapplicable.join(" ")}`,
                    );
                }

                const dirName = name ?? options.template;
                const targetDir = resolve(process.cwd(), dirName);
                if (dirName !== "." && existsSync(targetDir)) {
                    p.cancel(`目录已存在:${targetDir}(换一个目录名,或删除后重试)`);
                    process.exitCode = 1;
                    return;
                }

                p.intro(`dshp · 精选案例:${options.template}`);
                // 身份解耦:替换主词=插件 id(默认回落目录名);包名结构化写入(默认=插件 id,未显式给出时不写)
                const pluginId = options.pluginId ?? dirName;
                const pkgName = options.pkgName ?? pluginId;
                const files = copyScenarioCase(options.template, targetDir, pluginId, {
                    description: options.description,
                    author: options.author,
                    ...(options.pkgName ? { pkgName } : {}),
                });
                p.log.info(`已拷贝 ${files.length} 个文件 → ${targetDir}(项目身份重写为 ${dirName})`);
                p.outro(nextSteps(dirName));
                return;
            }

            const preset = findScenario(options.template);
            if (!preset) {
                p.log.error(
                    `未知场景 "${options.template}"。可用场景:${SCENARIO_IDS}(详见 dshp create --help)`,
                );
                process.exitCode = 1;
                return;
            }

            const dirName = name ?? preset.defaultDirName;
            const built = buildScenarioAnswers(preset, {
                dirName,
                pkgName: options.pkgName,
                pluginId: options.pluginId,
                description: options.description,
                author: options.author,
                pkgPosition: options.pkgPosition,
                config: options.config,
                toolName: options.toolName,
            });
            if (!built.answers) {
                p.log.error(built.error ?? "参数校验失败");
                process.exitCode = 1;
                return;
            }
            if (options.toolName && !preset.capabilities.atoms.includes("tool")) {
                p.log.warn("--tool-name 已设置,但当前场景不含 tool 原子,该值不会出现在生成物中");
            }
            const answers = built.answers;

            const targetDir = resolve(process.cwd(), answers.dirName);
            if (answers.dirName !== "." && existsSync(targetDir)) {
                p.cancel(`目录已存在:${targetDir}(换一个目录名,或删除后重试)`);
                process.exitCode = 1;
                return;
            }

            p.intro(`dshp · 场景快捷生成:${preset.id}(${preset.label})`);
            printSummary(answers); // 汇总照打,但不阻塞确认(非交互约定)

            const files = writeProject(answers, targetDir);
            p.log.info(`已生成 ${files.length} 个文件 → ${targetDir}`);
            p.outro(nextSteps(answers.dirName));
            return;
        }

        p.intro("dshp · DSH 插件骨架生成"); // 问卷横幅
        if (OVERRIDE_KEYS.some((k) => options[k] !== undefined)) {
            p.log.warn("覆盖类参数(--pkg-name/--config 等)仅在配合 --template 时生效,本次已忽略");
        }

        // 公共配置:目录名/描述/作者/包名/插件 id(与起点无关,分支前统一问完)
        const dirName = await askDirectoryName(name ?? "my-plugin");
        const meta = await askProjectMeta();
        const pkgName = await askPkgName(dirName); // 包名默认与目录名联动,回车即用
        const pluginId = await askPluginId(dirName); // 插件 id 默认与目录名联动,回车即用

        // 起点:公共配置就绪后才开始选;精选案例在前引导新手走金线
        const startPoint = await p.select({
            message: "从哪里开始?",
            initialValue: "case",
            options: [
                { value: "case", label: "精选案例", hint: "完整工程直接拷贝,开箱即跑" },
                { value: "atoms", label: "原子组合", hint: "按能力勾选,拼装最小骨架" },
            ],
        });
        if (typeof startPoint !== "string") { // 取消时 clack resolve 一个 symbol(typeof 守卫才能收窄,isCancel 不行)
            p.cancel("已取消,未生成任何文件。");
            return;
        }

        if (startPoint === "case") {
            const selected = await p.select({
                message: "选择精选案例",
                options: listScenarioCases().map((c) => ({ value: c, label: c, hint: CASE_HINTS[c] })),
            });
            if (typeof selected !== "string") {
                p.cancel("已取消,未生成任何文件。");
                return;
            }
            const targetDir = resolve(process.cwd(), dirName);
            if (dirName !== "." && existsSync(targetDir)) {
                p.cancel(`目录已存在:${targetDir}(换一个目录名,或删除后重试)`);
                return;
            }
            const files = copyScenarioCase(selected, targetDir, pluginId, {
                description: meta.description || undefined,
                author: meta.author || undefined,
                pkgName, // 替换主词=插件 id;包名结构化写入 package.json,与身份解耦
            });
            p.log.info(`已拷贝 ${files.length} 个文件 → ${targetDir}(项目身份重写为 ${dirName})`);
            p.outro(nextSteps(dirName));
            return;
        }

        // 原子组合分支剩余问卷:包定位 → 能力勾选 → 配置方式(其余公共配置已在分支前问完)
        const pkgPosition = await askPkgPosition(); // 包定位(精选案例随案例锁定,故仅原子路径询问)
        const cap = await askCapabilities(); // 能力勾选(默认 tool 黄金路径)
        const config = await askConfig(cap.uiSurfaces); // 配置方式(设置卡片硬约束在此生效)

        const answers: Answers = {
            dirName,
            pkgName,
            pluginId,
            toolName: cap.toolName,
            description: meta.description,
            author: meta.author,
            pkgPosition,
            atoms: cap.atoms,
            eventDomains: cap.eventDomains,
            uiSurfaces: cap.uiSurfaces,
            serviceCreate: cap.serviceCreate,
            serviceSeams: cap.serviceSeams,
            config,
        };

        // 全景汇总:人工确认页
        printSummary(answers);

        // 确认后落盘(M2:渲染模板 + 动态文件生成)
        const ok = await p.confirm({ message: "按以上答案生成项目?", initialValue: true });
        if (p.isCancel(ok) || !ok) {
            p.cancel("已取消,未生成任何文件。");
            return;
        }

        const targetDir = resolve(process.cwd(), answers.dirName);
        if (answers.dirName !== "." && existsSync(targetDir)) {
            p.cancel(`目录已存在:${targetDir}(换一个目录名,或删除后重试)`);
            return;
        }

        const files = writeProject(answers, targetDir);
        p.log.info(`已生成 ${files.length} 个文件 → ${targetDir}`);
        p.note(files.map((f) => `  ${f}`).join("\n"), "文件清单");
        p.outro(nextSteps(answers.dirName));
    });

program.parseAsync(process.argv);
