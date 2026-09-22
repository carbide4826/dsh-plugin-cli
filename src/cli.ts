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
import { t, setLang, type Lang } from "./locales";
import pkgJson from "../package.json" with { type: "json" };

const program = new Command();

const LANGS: readonly Lang[] = ["zh", "en"];

// 全局语言选项:LANG 环境自动探测,--lang 显式覆盖;help 渲染前也要生效,故放 program 级
program.option("--lang <lang>", "ui language: zh | en (default: auto-detect from LANG)");

// 把 --lang 的值落到 locales(非法值报错退出);help 渲染等早于 action 的路径也会调用
function applyLang(raw: unknown): void {
    if (raw === undefined) return;
    if (typeof raw !== "string" || !(LANGS as readonly string[]).includes(raw)) {
        process.stderr.write(`invalid --lang "${String(raw)}"; supported: ${LANGS.join(" | ")}\n`);
        process.exitCode = 1;
        return;
    }
    setLang(raw as Lang);
}

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

// 精选案例的一句话描述(交互与 --help 案例一览共用文案;惰性求值跟随语言)
function caseHint(id: string): string {
    return t(`cli.caseHints.${id}`);
}

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
    .addHelpText("after", () => {
        // help 渲染早于 action,--lang 在此先落一次(双语并排的手工 help 段收敛为按语言输出)
        applyLang(program.opts().lang);
        return `\n${t("cli.helpBody")}\n`;
    })
    .action(async (name: string | undefined, options: CreateOptions) => {
        applyLang(program.opts().lang); // 语言先于一切文案落地
        if (process.exitCode) return;

        // -s 精选案例路径:从 templates/scenarios/ 整目录拷贝并重写身份(所见即所得)
        if (options.scenario && !options.template) {
            p.log.error(t("cli.errScenarioNeedsTemplate"));
            process.exitCode = 1;
            return;
        }

        // --template 场景快捷入口:非交互一行命令,能力组合由场景预设锁定,
        // 其余字段可被命令行参数覆盖(传了用传的,没传回落预设)
        if (options.template) {
            if (options.scenario) {
                const cases = listScenarioCases();
                if (!cases.includes(options.template)) {
                    p.log.error(t("cli.errCaseNotFound", { name: options.template, cases: cases.join(", ") }));
                    process.exitCode = 1;
                    return;
                }
                const inapplicable = Object.entries(CASE_INAPPLICABLE_FLAGS)
                    .filter(([k]) => options[k as keyof CreateOptions] !== undefined)
                    .map(([, flag]) => flag ?? "");
                if (inapplicable.length > 0) {
                    p.log.warn(t("cli.warnCaseInapplicable", { flags: inapplicable.join(" ") }));
                }

                const dirName = name ?? options.template;
                const targetDir = resolve(process.cwd(), dirName);
                if (dirName !== "." && existsSync(targetDir)) {
                    p.cancel(t("cli.dirExists", { dir: targetDir }));
                    process.exitCode = 1;
                    return;
                }

                p.intro(t("cli.introCase", { name: options.template }));
                // 身份解耦:替换主词=插件 id(默认回落目录名);包名结构化写入(默认=插件 id,未显式给出时不写)
                const pluginId = options.pluginId ?? dirName;
                const pkgName = options.pkgName ?? pluginId;
                const files = copyScenarioCase(options.template, targetDir, pluginId, {
                    description: options.description,
                    author: options.author,
                    ...(options.pkgName ? { pkgName } : {}),
                });
                p.log.info(t("cli.copied", { n: files.length, dir: targetDir, name: dirName }));
                p.outro(nextSteps(dirName));
                return;
            }

            const preset = findScenario(options.template);
            if (!preset) {
                p.log.error(t("cli.errUnknownScenario", { name: options.template, ids: SCENARIO_IDS }));
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
                p.log.error(built.error ?? t("cli.errCheckFailed"));
                process.exitCode = 1;
                return;
            }
            if (options.toolName && !preset.capabilities.atoms.includes("tool")) {
                p.log.warn(t("cli.warnToolNameIgnored"));
            }
            const answers = built.answers;

            const targetDir = resolve(process.cwd(), answers.dirName);
            if (answers.dirName !== "." && existsSync(targetDir)) {
                p.cancel(t("cli.dirExists", { dir: targetDir }));
                process.exitCode = 1;
                return;
            }

            p.intro(t("cli.introPreset", { id: preset.id, label: preset.label() }));
            printSummary(answers); // 汇总照打,但不阻塞确认(非交互约定)

            const files = writeProject(answers, targetDir);
            p.log.info(t("cli.generated", { n: files.length, dir: targetDir }));
            p.outro(nextSteps(answers.dirName));
            return;
        }

        p.intro(t("cli.intro")); // 问卷横幅
        if (OVERRIDE_KEYS.some((k) => options[k] !== undefined)) {
            p.log.warn(t("cli.warnOverride"));
        }

        // 公共配置:目录名/描述/作者/包名/插件 id(与起点无关,分支前统一问完)
        const dirName = await askDirectoryName(name ?? "my-plugin");
        const meta = await askProjectMeta();
        const pkgName = await askPkgName(dirName); // 包名默认与目录名联动,回车即用
        const pluginId = await askPluginId(dirName); // 插件 id 默认与目录名联动,回车即用

        // 起点:公共配置就绪后才开始选;精选案例在前引导新手走金线
        const startPoint = await p.select({
            message: t("cli.startMessage"),
            initialValue: "case",
            options: [
                { value: "case", label: t("cli.startCase"), hint: t("cli.startCaseHint") },
                { value: "atoms", label: t("cli.startAtoms"), hint: t("cli.startAtomsHint") },
            ],
        });
        if (typeof startPoint !== "string") { // 取消时 clack resolve 一个 symbol(typeof 守卫才能收窄,isCancel 不行)
            p.cancel(t("cli.cancelledNoFiles"));
            return;
        }

        if (startPoint === "case") {
            const selected = await p.select({
                message: t("cli.caseSelect"),
                options: listScenarioCases().map((c) => ({ value: c, label: c, hint: caseHint(c) })),
            });
            if (typeof selected !== "string") {
                p.cancel(t("cli.cancelledNoFiles"));
                return;
            }
            const targetDir = resolve(process.cwd(), dirName);
            if (dirName !== "." && existsSync(targetDir)) {
                p.cancel(t("cli.dirExists", { dir: targetDir }));
                return;
            }
            const files = copyScenarioCase(selected, targetDir, pluginId, {
                description: meta.description || undefined,
                author: meta.author || undefined,
                pkgName, // 替换主词=插件 id;包名结构化写入 package.json,与身份解耦
            });
            p.log.info(t("cli.copied", { n: files.length, dir: targetDir, name: dirName }));
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
        const ok = await p.confirm({ message: t("cli.confirmGenerate"), initialValue: true });
        if (p.isCancel(ok) || !ok) {
            p.cancel(t("cli.cancelledNoFiles"));
            return;
        }

        const targetDir = resolve(process.cwd(), answers.dirName);
        if (answers.dirName !== "." && existsSync(targetDir)) {
            p.cancel(t("cli.dirExists", { dir: targetDir }));
            return;
        }

        const files = writeProject(answers, targetDir);
        p.log.info(t("cli.generated", { n: files.length, dir: targetDir }));
        p.note(files.map((f) => `  ${f}`).join("\n"), t("cli.fileList"));
        p.outro(nextSteps(answers.dirName));
    });

program.parseAsync(process.argv);
