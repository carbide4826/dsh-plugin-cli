#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import { findScenario, SCENARIOS } from "./domain/scenarios";
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
import { listScenarioCases } from "./generate/scenarioCase";
import { getTrackManifest, resolveTrackTarget, type TrackTarget } from "./domain/manifests";
import { parseIdList } from "./core/capabilities";
import { describeCatalog } from "./core/describe";
import {
    resolveCreate,
    planCreate,
    writeCreate,
    nextSteps as coreNextSteps,
} from "./core/create";
import { t, setLang, renderError, type Lang } from "./locales";
import { DshpError, isDshpError } from "./core/errors";
import { startMcpServer } from "./mcp/server";
import pkgJson from "../package.json" with { type: "json" };

const program = new Command();

const LANGS: readonly Lang[] = ["zh", "en"];

// 全局语言选项:LANG 环境自动探测,--lang 显式覆盖;help 渲染前也要生效,故放 program 级
program.option("--lang <lang>", "ui language: zh | en (default: auto-detect from LANG)");

// 把 --lang 的值落到 locales(非法值报错退出);help 渲染等早于 action 的路径也会调用
function applyLang(raw: unknown): void {
    if (raw === undefined) return;
    if (typeof raw !== "string" || !(LANGS as readonly string[]).includes(raw)) {
        p.log.error(
            renderError(
                new DshpError("LANG_INVALID", { values: LANGS.join(" | ") }),
            ),
        );
        process.exitCode = 1;
        return;
    }
    setLang(raw as Lang);
}

// 生成完成后的统一提示(交互与非交互两条路径共用,与 core/create 的 nextSteps 同源)
function nextSteps(dirName: string): string {
    return coreNextSteps(dirName).join("\n");
}

// 报错提示用的场景 id 清单(如 "tool, llm, ui, events, protocol")
const SCENARIO_IDS = SCENARIOS.map((s) => s.id).join(", ");

/**
 * dryRun:打印将要生成的文件清单,但**不落盘**。
 * 用途:agent/脚本先看清要生成什么再决定写不写(MCP 路径的「显式确认后写盘」也依赖这层)。
 */
function printDryRun(files: string[], targetDir: string): void {
    p.note(
        files.map((f) => `  ${f}`).join("\n"),
        t("cli.dryRunTitle", { n: files.length, dir: targetDir }),
    );
    p.outro(t("cli.dryRunHint"));
}

// 精选案例的一句话描述(交互与 --help 案例一览共用文案;惰性求值跟随语言)
function caseHint(id: string): string {
    return t(`cli.caseHints.${id}`);
}

// create 命令的选项集合(--template 模式下的覆盖参数,均可在缺省时回落预设)
interface CreateOptions {
    template?: string;
    scenario?: boolean;
    target?: string;
    pkgName?: string;
    pluginId?: string;
    toolName?: string;
    description?: string;
    author?: string;
    pkgPosition?: string;
    config?: string;
    atoms?: string;
    eventDomains?: string;
    uiSurfaces?: string;
    serviceSeams?: string;
    newService?: boolean;
    dryRun?: boolean;
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

// 能力类参数清单:任一出现即走自由组合的非交互路径(不给则走交互问卷)
const CAPABILITY_KEYS = [
    "atoms",
    "eventDomains",
    "uiSurfaces",
    "serviceSeams",
    "newService",
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

// list 子命令:一览「能选什么」(预设 / 案例 / 原子 / 事件域 / 界面位 / 缝 / 两轨版本配套)。
// --json 给机器读(agent / MCP 的 list tool 直接消费);默认给人读。
program
    .command("list")
    .description("List available presets, curated cases, atoms, surfaces and seams")
    .option("--json", "machine-readable JSON output")
    .option("--target <track>", "only list one track: latest | next")
    .action((options: { json?: boolean; target?: string }) => {
        applyLang(program.opts().lang);
        if (process.exitCode) return;

        // --target 过滤:校验轨名后取该轨(非法轨名报错,不静默回落)
        let targets: TrackTarget[] | undefined;
        if (options.target !== undefined) {
            const m = resolveTrackTarget(options.target);
            if (!m) {
                p.log.error(
                    renderError(
                        new DshpError("UNKNOWN_TARGET", {
                            value: options.target,
                            targets: "latest, next",
                        }),
                    ),
                );
                process.exitCode = 1;
                return;
            }
            targets = [m.target];
        }

        const catalog = describeCatalog(targets);

        if (options.json) {
            process.stdout.write(JSON.stringify(catalog, null, 2) + "\n");
            return;
        }

        // 列宽 18:最长的 id(settings-card = 13 字符)+ 2 缩进 + 至少 2 空格分隔
        const line = (k: string, v: string) => `${k.padEnd(18)}${v}`;
        const out: string[] = [];
        out.push(t("cli.listTracks"));
        for (const tr of catalog.tracks) {
            out.push(
                line(
                    `  ${tr.target}`,
                    `dsh ${tr.dshVersion} · cordis ${tr.cordisPeer} · schemastery ${tr.schemasteryVersion} · 槽位 ${tr.settingsSlot}`,
                ),
            );
        }
        out.push("", t("cli.listPresets"));
        for (const s of catalog.presets) {
            out.push(line(`  ${s.id}`, `${s.label} · 原子 ${s.atoms.join(",") || "-"}`));
        }
        out.push("", t("cli.listCases"));
        for (const c of catalog.cases) {
            out.push(line(`  ${c.target}/${c.id}`, ""));
        }
        out.push("", t("cli.listAtoms"));
        for (const a of catalog.atoms) {
            out.push(line(`  ${a.id}`, `${a.label} · ${a.desc}`));
        }
        out.push("", t("cli.listEventDomains"));
        for (const d of catalog.eventDomains) {
            out.push(line(`  ${d.id}`, `${d.label} · ${d.eventCount} 事件`));
        }
        out.push("", t("cli.listUiSurfaces"));
        for (const s of catalog.uiSurfaces) {
            const req = s.requires.length ? ` · 需原子 ${s.requires.join(",")}` : "";
            out.push(
                line(`  ${s.id}`, `${s.label} · 槽位 ${s.slots.join("/")}${req}`),
            );
        }
        out.push("", t("cli.listSeams"));
        for (const s of catalog.seams) {
            out.push(line(`  ${s.id}`, `${s.label} · ${s.desc}`));
        }
        process.stdout.write(out.join("\n") + "\n");
    });

// mcp 子命令:以 stdio 协议起 MCP server,把生成能力暴露给模型。
// stdout 是 JSON-RPC 通道,这个子命令一行都不往 stdout 写(提示与报错只走 stderr)。
program
    .command("mcp")
    .description("Run the MCP server over stdio (tools: dshp_list_scenarios / dshp_create_plugin / dshp_doctor)")
    .option("--lang <lang>", "ui language of generated projects: zh | en (default: auto-detect from LANG)")
    .action(async (options: { lang?: string }) => {
        // 语言:子命令级优先,其次 program 级(--lang 放在子命令前后都认)
        const raw = options.lang ?? program.opts().lang;
        if (raw !== undefined) {
            if (typeof raw !== "string" || !(LANGS as readonly string[]).includes(raw)) {
                // 报错走 stderr:stdout 是 JSON-RPC 通道,写进去会污染协议流
                console.error(`[dshp] --lang 仅支持:${LANGS.join(" | ")}`);
                process.exitCode = 1;
                return;
            }
            setLang(raw as Lang);
        }
        await startMcpServer();
    });

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
    .option(
        "--target <track>",
        "dsh host track to pair with: latest (default) | next",
    )
    .option("--pkg-name <name>", "override npm package name (default: derived from plugin id; plugin id defaults to dir name)")
    .option("--plugin-id <id>", "override plugin id (default: derived from dir name)")
    .option("--tool-name <name>", "override tool name (for the tool scenario)")
    .option("--description <text>", "override description (default: scenario preset; with -s, replaces the case description)")
    .option("--author <name>", "override author")
    .option("--pkg-position <position>", "package position: bundle | library (default: bundle)")
    .option("--config <mode>", "config mode: none | static | dynamic (default: scenario preset)")
    .option(
        "--atoms <list>",
        "comma-separated atoms for free combination (tool, events, service, ui, protocol); non-interactive",
    )
    .option(
        "--event-domains <list>",
        "comma-separated event domains (tools, agent, session, approval, fs, settings)",
    )
    .option(
        "--ui-surfaces <list>",
        "comma-separated UI surfaces (settings-card, chat-node, input-dock, sidebar, tool-view, session-header)",
    )
    .option(
        "--service-seams <list>",
        "comma-separated capability seams (llm, systemPrompt, subagents, web, commands, storage)",
    )
    .option(
        "--new-service",
        "create a new own service (extends Service); only with --atoms service",
    )
    .option(
        "--dry-run",
        "print the file tree that would be generated without writing anything to disk",
    )
    .addHelpText("after", () => {
        // help 渲染早于 action,--lang 在此先落一次(双语并排的手工 help 段收敛为按语言输出)
        applyLang(program.opts().lang);
        return `\n${t("cli.helpBody")}\n`;
    })
    .action(async (name: string | undefined, options: CreateOptions) => {
        applyLang(program.opts().lang); // 语言先于一切文案落地
        if (process.exitCode) return;

        // 四条生成路径(预设 / 案例 / 自由组合 / 交互问卷)统一走 core/create 的解析与落盘,
        // 校验规则只有一份 —— MCP 侧调的是同一套,两边不会漂。
        try {
            // 目标轨解析:缺省 latest;非法值报错并列出合法轨名
            const manifest = resolveTrackTarget(options.target);
            if (!manifest) {
                p.log.error(
                    renderError(
                        new DshpError("UNKNOWN_TARGET", {
                            value: String(options.target),
                            targets: "latest, next",
                        }),
                    ),
                );
                process.exitCode = 1;
                return;
            }

            // -s 精选案例路径:从 templates/scenarios/ 整目录拷贝并重写身份(所见即所得)
            if (options.scenario && !options.template) {
                p.log.error(
                    renderError(new DshpError("SCENARIO_REQUIRES_TEMPLATE")),
                );
                process.exitCode = 1;
                return;
            }

            // --template 场景快捷入口:非交互一行命令,能力组合由场景预设锁定,
            // 其余字段可被命令行参数覆盖(传了用传的,没传回落预设)
            if (options.template) {
                if (options.scenario) {
                    // 案例:结构随案例锁定,这几项覆盖参数不适用(提醒但不拦)
                    const inapplicable = Object.entries(CASE_INAPPLICABLE_FLAGS)
                        .filter(([k]) => options[k as keyof CreateOptions] !== undefined)
                        .map(([, flag]) => flag ?? "");
                    if (inapplicable.length > 0) {
                        p.log.warn(
                            renderError(
                                new DshpError("CASE_FLAG_INAPPLICABLE", {
                                    flags: inapplicable.join(" "),
                                }),
                            ),
                        );
                    }

                    const resolved = resolveCreate({
                        mode: "case",
                        case: options.template,
                        dirName: name ?? options.template,
                        target: options.target,
                        pluginId: options.pluginId,
                        pkgName: options.pkgName,
                        description: options.description,
                        author: options.author,
                    });
                    p.intro(t("cli.introCase", { name: options.template }));
                    const files = writeCreate(resolved);
                    p.log.info(
                        t("cli.copied", {
                            n: files.length,
                            dir: resolved.targetDir,
                            name: resolved.dirName,
                        }),
                    );
                    p.outro(nextSteps(resolved.dirName));
                    return;
                }

                const preset = findScenario(options.template);
                if (!preset) {
                    p.log.error(
                        renderError(
                            new DshpError("UNKNOWN_SCENARIO", {
                                name: options.template,
                                ids: SCENARIO_IDS,
                            }),
                        ),
                    );
                    process.exitCode = 1;
                    return;
                }
                if (options.toolName && !preset.capabilities.atoms.includes("tool")) {
                    p.log.warn(renderError(new DshpError("TOOL_NAME_IGNORED")));
                }

                const resolved = resolveCreate({
                    mode: "preset",
                    preset: options.template,
                    dirName: name ?? preset.defaultDirName,
                    target: options.target,
                    pkgName: options.pkgName,
                    pluginId: options.pluginId,
                    toolName: options.toolName,
                    description: options.description,
                    author: options.author,
                    pkgPosition: options.pkgPosition,
                    config: options.config,
                });
                p.intro(t("cli.introPreset", { id: preset.id, label: preset.label() }));
                printSummary(resolved.answers!, resolved.manifest); // 汇总照打,但不阻塞确认(非交互约定)

                if (options.dryRun) {
                    printDryRun(planCreate(resolved), resolved.targetDir);
                    return;
                }
                const files = writeCreate(resolved);
                p.log.info(
                    t("cli.generated", { n: files.length, dir: resolved.targetDir }),
                );
                p.outro(nextSteps(resolved.dirName));
                return;
            }

            // 自由组合非交互入口:给了任一能力类参数就走这条路(不经问卷)
            // —— agent/脚本/CI 需要「我要 tool + ui + settings-card」这种精确意图,而问卷是 TTY 的
            if (CAPABILITY_KEYS.some((k) => options[k] !== undefined)) {
                const resolved = resolveCreate({
                    mode: "free",
                    dirName: name,
                    target: options.target,
                    atoms: parseIdList(options.atoms),
                    eventDomains: parseIdList(options.eventDomains),
                    uiSurfaces: parseIdList(options.uiSurfaces),
                    serviceSeams: parseIdList(options.serviceSeams),
                    newService: options.newService,
                    config: options.config,
                    toolName: options.toolName,
                    pkgName: options.pkgName,
                    pluginId: options.pluginId,
                    description: options.description,
                    author: options.author,
                    pkgPosition: options.pkgPosition,
                });

                p.intro(
                    t("cli.introFree", {
                        atoms: resolved.answers!.atoms.join(", ") || "-",
                    }),
                );
                printSummary(resolved.answers!, resolved.manifest);

                if (options.dryRun) {
                    printDryRun(planCreate(resolved), resolved.targetDir);
                    return;
                }
                const files = writeCreate(resolved);
                p.log.info(
                    t("cli.generated", { n: files.length, dir: resolved.targetDir }),
                );
                p.note(files.map((f) => `  ${f}`).join("\n"), t("cli.fileList"));
                p.outro(nextSteps(resolved.dirName));
                return;
            }

            p.intro(t("cli.intro")); // 问卷横幅
            if (OVERRIDE_KEYS.some((k) => options[k] !== undefined)) {
                p.log.warn(renderError(new DshpError("OVERRIDE_WITHOUT_TEMPLATE")));
            }

            // 公共配置:目录名/描述/作者/包名/插件 id(与起点无关,分支前统一问完)
            const dirName = await askDirectoryName(name ?? "my-plugin");
            const meta = await askProjectMeta();
            const pkgName = await askPkgName(dirName); // 包名默认与目录名联动,回车即用
            const pluginId = await askPluginId(dirName); // 插件 id 默认与目录名联动,回车即用

            // 目标版本轴:配套哪一代 dsh 宿主(latest 保守跟随;next 积极跟随)
            // --target 在交互路径同样生效:作为选项初值(非法值已在上面报错退出),回车即锁定该轨
            const pickedTrack = await p.select({
                message: t("cli.targetMessage"),
                initialValue: options.target ?? "latest",
                options: [
                    { value: "latest", label: `latest · dsh ${getTrackManifest("latest").version}`, hint: t("cli.targetLatestHint") },
                    { value: "next", label: `next · dsh ${getTrackManifest("next").version}`, hint: t("cli.targetNextHint") },
                ],
            });
            if (typeof pickedTrack !== "string") {
                p.cancel(t("cli.cancelledNoFiles"));
                return;
            }

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
                    options: listScenarioCases(manifest).map((c) => ({ value: c, label: c, hint: caseHint(c) })),
                });
                if (typeof selected !== "string") {
                    p.cancel(t("cli.cancelledNoFiles"));
                    return;
                }
                const resolved = resolveCreate({
                    mode: "case",
                    case: selected,
                    dirName,
                    target: pickedTrack,
                    pluginId,
                    pkgName, // 替换主词=插件 id;包名结构化写入 package.json,与身份解耦
                    description: meta.description || undefined,
                    author: meta.author || undefined,
                });
                const files = writeCreate(resolved);
                p.log.info(
                    t("cli.copied", {
                        n: files.length,
                        dir: resolved.targetDir,
                        name: dirName,
                    }),
                );
                p.outro(nextSteps(dirName));
                return;
            }

            // 原子组合分支剩余问卷:包定位 → 能力勾选 → 配置方式(其余公共配置已在分支前问完)
            const pkgPosition = await askPkgPosition(); // 包定位(精选案例随案例锁定,故仅原子路径询问)
            const cap = await askCapabilities(); // 能力勾选(默认 tool 黄金路径)
            const config = await askConfig(cap.uiSurfaces); // 配置方式(设置卡片硬约束在此生效)

            // 解析(校验与 CLI 非交互路径同规则):目录占用等硬约束在这里暴露
            const resolved = resolveCreate({
                mode: "free",
                dirName,
                target: pickedTrack,
                atoms: cap.atoms,
                eventDomains: cap.eventDomains,
                uiSurfaces: cap.uiSurfaces,
                serviceSeams: cap.serviceSeams,
                newService: cap.serviceCreate,
                config,
                toolName: cap.toolName,
                pkgName,
                pluginId,
                description: meta.description,
                author: meta.author,
                pkgPosition,
            });

            // 全景汇总:人工确认页
            printSummary(resolved.answers!, resolved.manifest);

            // 确认后落盘(渲染模板 + 动态文件生成)
            const ok = await p.confirm({ message: t("cli.confirmGenerate"), initialValue: true });
            if (p.isCancel(ok) || !ok) {
                p.cancel(t("cli.cancelledNoFiles"));
                return;
            }

            const files = writeCreate(resolved);
            p.log.info(
                t("cli.generated", { n: files.length, dir: resolved.targetDir }),
            );
            p.note(files.map((f) => `  ${f}`).join("\n"), t("cli.fileList"));
            p.outro(nextSteps(resolved.dirName));
        } catch (err) {
            // 领域错误带稳定 code,按 code 渲染人话;非领域错误(真 bug)原样抛栈
            if (isDshpError(err)) {
                p.log.error(renderError(err));
                process.exitCode = 1;
                return;
            }
            throw err;
        }
    });

program.parseAsync(process.argv).catch((err: unknown) => {
    // 领域错误带稳定 code,按 code 渲染人话;非领域错误(真 bug)原样抛栈
    if (err instanceof DshpError) {
        p.log.error(renderError(err));
        process.exitCode = 1;
        return;
    }
    throw err;
});
