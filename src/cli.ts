#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import type { Answers } from "./domain/types";
import { buildScenarioAnswers, findScenario, SCENARIOS } from "./domain/scenarios";
import { askBasic } from "./prompts/basic";
import { askCapabilities } from "./prompts/capabilities";
import { askConfig } from "./prompts/config";
import { printSummary } from "./prompts/summary";
import { writeProject } from "./generate/project";
import { copyScenarioCase, listScenarioCases } from "./generate/scenarioCase";
import pkgJson from "../package.json" with { type: "json" };

const program = new Command();

// 生成完成后的统一提示(交互与非交互两条路径共用,避免文案漂移)
const NEXT_STEPS =
    "下一步:pnpm install → pnpm build | 本地调试:dsh web --patch ./dev.patch.yml | 建议:git init && git add -A";

// 报错提示用的场景 id 清单(如 "tool, llm, ui, events, protocol")
const SCENARIO_IDS = SCENARIOS.map((s) => s.id).join(", ");

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
    .option("--pkg-name <name>", "override npm package name (default: derived from dir name)")
    .option("--plugin-id <id>", "override plugin id (default: derived from dir name)")
    .option("--tool-name <name>", "override tool name (for the tool scenario)")
    .option("--description <text>", "override description (default: scenario preset)")
    .option("--author <name>", "override author")
    .option("--pkg-position <position>", "package position: bundle | library (default: bundle)")
    .option("--config <mode>", "config mode: none | static | dynamic (default: scenario preset)")
    .addHelpText(
        "after",
        `
场景快捷生成(非交互,一行命令,--template 有两个来源,用 -s 区分):

1) 预设组合(默认):按预设勾选组合实时生成最小骨架
   dshp create <name> --template <preset>     目录/包名/id 由 name 推导,其余取预设
   dshp create --template <preset>            未给 name 时用预设默认目录名

   预设一览:tool | llm | ui | events | protocol
     tool       工具示例(tool 原子,toolName=example_tool)
     llm        LLM 服务示例(service + llm 缝)
     ui         界面示例(settings-card,静态配置)
     events     事件监听示例(session 域)
     protocol   HTTP 协议示例(protocol 原子)

2) 精选案例(-s):从 templates/scenarios/ 整目录拷贝真实可执行的完整案例,
   项目身份(包名/插件 id/patch id)随 name 重写;所见即所得,覆盖参数不适用
   dshp create <name> --template <case> -s    未给 name 时用案例 id 作目录名

   案例一览(以 templates/scenarios/ 目录为准):
     quick-tool      自定义查询工具 + 结果卡片(tool + tool-view)
     model-gateway   接入自有模型服务(llm 缝 + 设置卡片动态配置)
     session-bot     监听会话自动响应(events + llm 缝)
     webhook-bridge  外部事件桥接进会话(protocol + events)
     notebook        用户数据存取(storage 缝 + tool)

可覆盖字段(仅预设组合模式,传了用传的,没传回落预设/推导值):
  --pkg-name <name>          npm 包名(默认=目录名)
  --plugin-id <id>           插件 id(默认=目录名)
  --tool-name <name>         工具名(tool 场景默认 example_tool)
  --description <text>       描述(默认=场景预设文案)
  --author <name>            作者(默认空)
  --pkg-position <position>  包定位:bundle | library(默认 bundle)
  --config <mode>            配置方式:none | static | dynamic(默认=场景预设)
`,
    )
    .action(async (name: string | undefined, options: CreateOptions) => {
        // 【M3】-s 精选案例路径:从 templates/scenarios/ 整目录拷贝并重写身份(所见即所得)
        if (options.scenario && !options.template) {
            p.log.error("--scenario(-s)需与 --template <案例id> 搭配使用(详见 dshp create --help)");
            process.exitCode = 1;
            return;
        }

        // 【M3】--template 场景快捷入口:非交互一行命令,能力组合由场景预设锁定,
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
                if (OVERRIDE_KEYS.some((k) => options[k] !== undefined)) {
                    p.log.warn("精选案例所见即所得,覆盖类参数不适用,本次已忽略");
                }

                const dirName = name ?? options.template;
                const targetDir = resolve(process.cwd(), dirName);
                if (dirName !== "." && existsSync(targetDir)) {
                    p.cancel(`目录已存在:${targetDir}(换一个目录名,或删除后重试)`);
                    process.exitCode = 1;
                    return;
                }

                p.intro(`dshp · 精选案例:${options.template}`);
                const files = copyScenarioCase(options.template, targetDir, dirName);
                p.log.info(`已拷贝 ${files.length} 个文件 → ${targetDir}(项目身份重写为 ${dirName})`);
                p.outro(NEXT_STEPS);
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
            p.outro(NEXT_STEPS);
            return;
        }

        p.intro("dshp · DSH 插件骨架生成"); // 问卷横幅
        if (OVERRIDE_KEYS.some((k) => options[k] !== undefined)) {
            p.log.warn("覆盖类参数(--pkg-name/--config 等)仅在配合 --template 时生效,本次已忽略");
        }

        // ① 三组问卷依次收集(汇总 Answers 在此组装)
        const basic = await askBasic(name); // 第 1 组:目录/包名/插件 id/描述作者/定位
        const cap = await askCapabilities(); // 第 2 组:能力勾选(默认 tool 黄金路径)
        const config = await askConfig(cap.uiSurfaces); // 第 3 组:配置方式(设置卡片硬约束在此生效)

        const answers: Answers = {
            dirName: basic.dirName,
            pkgName: basic.pkgName,
            pluginId: basic.pluginId,
            toolName: cap.toolName,
            description: basic.description,
            author: basic.author,
            pkgPosition: basic.pkgPosition,
            atoms: cap.atoms,
            eventDomains: cap.eventDomains,
            uiSurfaces: cap.uiSurfaces,
            serviceCreate: cap.serviceCreate,
            serviceSeams: cap.serviceSeams,
            config,
        };

        // ② 全景汇总:人工确认页
        printSummary(answers);

        // ③ 确认后落盘(M2:渲染模板 + 动态文件生成)
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
        p.outro(NEXT_STEPS);
    });

program.parseAsync(process.argv);
