#!/usr/bin/env node
// drive-questionnaire.mjs — 自由原子组合的非交互入口(壳):参数 → CLI 原生 flag → 生成
//
// 演化史(别倒退):本脚本最初是**驱动交互问卷**的 —— 当时 CLI 没有自由组合的 flag,
// 只能逆向 clack 的按键语义(select 下移别名 / 空格切换 / text 预填值退格清除),
// 一次几十次试错,400 行固化下来。2026-10-21 起 CLI 有了原生入口:
//   --atoms / --event-domains / --ui-surfaces / --service-seams / --new-service / --dry-run
// 于是本脚本退化成一层薄壳:保留「参数校验 + 生成后自检 + JSON 摘要」的便利,
// 彻底删掉按键驱动 —— 那套东西的脆性(提示语文本即同步锚点,CLI 改文案即失配)一并消失。
//
// 用法(与旧版参数面兼容,旧调用方不用改):
//   node drive-questionnaire.mjs --dir my-orders --target next \
//     --atoms tool,ui --surfaces settings-card --tool-name query_orders \
//     [--events tools,agent] [--seams llm] [--create-service] \
//     [--description "..."] [--author "..."] [--pkg-name x] [--plugin-id y] \
//     [--pkg-position bundle|library] [--config none|static|dynamic] [--lang zh|en]
//
// 退出码:0 成功(并打印 JSON 摘要)· 1 参数非法或 CLI 拒绝 · 2 生成后自检缺文件
//
// 依赖:仅 Node.js 内置模块(无第三方包)。

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// 脚本随 npm 包发布:skills/dshp/scripts → 上溯三层即包根,dist/cli.mjs 是同版本产物
const PKG_ROOT = resolve(HERE, "../../..");
const BUNDLED_CLI = join(PKG_ROOT, "dist", "cli.mjs");

// 清单只用于**本地前置校验**与自检推算;真正的权威在 CLI 侧(同一套 domain 清单),
// 这里的副本只为让报错更早更清楚(不等 CLI 起来才说)。CLI 若有更新版本,这里可能偏保守
// (拒绝 CLI 已支持的取值),不会漏放 —— 偏保守的方向是安全的。
const ATOMS = ["tool", "events", "service", "ui", "protocol"];
const EVENT_DOMAINS = ["tools", "agent", "session", "approval", "fs", "settings"];
const UI_SURFACES = [
    "settings-card",
    "chat-node",
    "input-dock",
    "sidebar",
    "tool-view",
    "session-header",
];
const SEAMS = ["llm", "systemPrompt", "subagents", "web", "commands", "storage"];

/** 解析 --key value / --flag 形式的长选项 */
function parseArgs(argv) {
    const o = {
        dir: undefined,
        target: "latest",
        atoms: [],
        events: [],
        uiSurfaces: [],
        seams: [],
        createService: false,
        toolName: undefined,
        description: undefined,
        author: undefined,
        pkgName: undefined,
        pluginId: undefined,
        pkgPosition: "bundle",
        config: "none",
        lang: "zh",
        cli: undefined,
        dryRun: false,
    };
    const list = (raw) =>
        raw
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => {
            const v = argv[++i];
            if (v === undefined) throw new Error(`${a} 缺值`);
            return v;
        };
        switch (a) {
            case "--dir": o.dir = next(); break;
            case "--target": o.target = next(); break;
            case "--atoms": o.atoms = list(next()); break;
            case "--events": o.events = list(next()); break;
            case "--surfaces": o.uiSurfaces = list(next()); break;
            case "--seams": o.seams = list(next()); break;
            case "--create-service": o.createService = true; break;
            case "--tool-name": o.toolName = next(); break;
            case "--description": o.description = next(); break;
            case "--author": o.author = next(); break;
            case "--pkg-name": o.pkgName = next(); break;
            case "--plugin-id": o.pluginId = next(); break;
            case "--pkg-position": o.pkgPosition = next(); break;
            case "--config": o.config = next(); break;
            case "--lang": o.lang = next(); break;
            case "--cli": o.cli = next(); break;
            case "--dry-run": o.dryRun = true; break;
            default: throw new Error(`未知参数:${a}`);
        }
    }
    return o;
}

function validate(o) {
    const bad = (m) => {
        throw new Error(m);
    };
    if (!o.dir) bad("--dir 必填");
    if (!["latest", "next"].includes(o.target)) bad(`--target 取值非法:${o.target}`);
    if (!["bundle", "library"].includes(o.pkgPosition)) bad(`--pkg-position 取值非法:${o.pkgPosition}`);
    if (!["none", "static", "dynamic"].includes(o.config)) bad(`--config 取值非法:${o.config}`);
    for (const a of o.atoms) if (!ATOMS.includes(a)) bad(`--atoms 含未知原子:${a}`);
    for (const e of o.events) if (!EVENT_DOMAINS.includes(e)) bad(`--events 含未知事件域:${e}`);
    for (const u of o.uiSurfaces) if (!UI_SURFACES.includes(u)) bad(`--surfaces 含未知界面位:${u}`);
    for (const s of o.seams) if (!SEAMS.includes(s)) bad(`--seams 含未知缝:${s}`);
    // 硬约束(与 CLI 侧同一套规则):勾了原子就得给出对应清单项
    if (o.atoms.includes("events") && o.events.length === 0) bad("勾了 events 原子,须用 --events 给出事件域");
    if (o.atoms.includes("ui") && o.uiSurfaces.length === 0) bad("勾了 ui 原子,须用 --surfaces 给出界面位");
    if (o.atoms.includes("service") && o.seams.length === 0 && !o.createService) {
        bad("勾了 service 原子,须用 --seams 给出缝或用 --create-service 新建服务");
    }
    // 界面位依赖原子:全部界面位都要 ui 原子(界面位实现与 client 聚合入口由 ui 原子产出,
    // 缺了就静默丢弃界面位选择);tool-view 额外要 tool
    if (o.uiSurfaces.length > 0 && !o.atoms.includes("ui")) {
        bad("勾了界面位,须同勾 ui 原子(界面位实现由 ui 原子产出,缺了界面位一个都不渲染)");
    }
    if (o.uiSurfaces.includes("tool-view") && !o.atoms.includes("tool")) {
        bad("界面位 tool-view 必须同勾 tool 原子");
    }
    // 设置卡片必须有配置
    if (o.uiSurfaces.includes("settings-card") && o.config === "none") {
        bad("界面位 settings-card 不能配 config=none");
    }
    if (o.atoms.includes("tool") && !o.toolName) bad("勾了 tool 原子,须用 --tool-name 给出工具名");
}

/** 组装 CLI 参数(原生 flag;能力选择走 --atoms 等,不再驱动问卷) */
function cliArgs(o) {
    const args = ["create", o.dir, "--target", o.target, "--lang", o.lang];
    if (o.atoms.length) args.push("--atoms", o.atoms.join(","));
    if (o.events.length) args.push("--event-domains", o.events.join(","));
    if (o.uiSurfaces.length) args.push("--ui-surfaces", o.uiSurfaces.join(","));
    if (o.seams.length) args.push("--service-seams", o.seams.join(","));
    if (o.createService) args.push("--new-service");
    if (o.toolName) args.push("--tool-name", o.toolName);
    if (o.description) args.push("--description", o.description);
    if (o.author) args.push("--author", o.author);
    if (o.pkgName) args.push("--pkg-name", o.pkgName);
    if (o.pluginId) args.push("--plugin-id", o.pluginId);
    args.push("--pkg-position", o.pkgPosition);
    args.push("--config", o.config);
    if (o.dryRun) args.push("--dry-run");
    return args;
}

function resolveCli(o) {
    if (o.cli) return { cmd: "node", args: [resolve(o.cli)] };
    if (existsSync(BUNDLED_CLI)) return { cmd: "node", args: [BUNDLED_CLI] };
    return { cmd: "npx", args: ["-y", "create-dsh-plugin-cli"] };
}

/** 跑 CLI;透传 stdout/stderr;返回退出码 */
function runCli(o) {
    return new Promise((resolvePromise) => {
        const cli = resolveCli(o);
        const args = [...cli.args, ...cliArgs(o)];
        const child = spawn(cli.cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
        child.on("error", (err) => {
            process.stderr.write(`无法启动 CLI(${cli.cmd} ${cli.args.join(" ")}):${err.message}\n`);
            resolvePromise(1);
        });
        child.on("exit", (code) => resolvePromise(code ?? 1));
    });
}

/** 生成后自检:按勾选推应有文件是否落地 */
function selfCheck(dir, o) {
    const root = resolve(process.cwd(), dir);
    const expect = ["package.json", "tsconfig.json", "src/index.ts"];
    if (o.pkgPosition === "bundle") expect.push("cordis.patch.yml", "dev.patch.yml");
    if (o.atoms.includes("tool")) expect.push("src/tool.ts");
    if (o.atoms.includes("events")) expect.push("src/events.ts");
    if (o.atoms.includes("ui")) expect.push("src/client/index.ts");
    if (o.atoms.includes("service") && o.createService) expect.push("src/service.ts");
    const missing = expect.filter((f) => !existsSync(join(root, f)));
    return { root, checked: expect, missing };
}

async function main() {
    let o;
    try {
        o = parseArgs(process.argv.slice(2));
        validate(o);
    } catch (err) {
        process.stderr.write(`参数错误:${err.message}\n`);
        process.exit(1);
    }

    // dry-run:只打印将要执行的命令(不跑 CLI)—— 便于先看清要干什么
    if (o.dryRun) {
        const cli = resolveCli(o);
        process.stdout.write(
            JSON.stringify(
                {
                    dryRun: true,
                    dir: o.dir,
                    target: o.target,
                    command: [cli.cmd, ...cli.args, ...cliArgs(o)],
                },
                null,
                2,
            ) + "\n",
        );
        return;
    }

    const code = await runCli(o);
    if (code !== 0) {
        process.stderr.write(`CLI 退出码 ${code}\n`);
        process.exit(1);
    }

    const check = selfCheck(o.dir, o);
    process.stdout.write(
        JSON.stringify(
            {
                ok: check.missing.length === 0,
                dir: check.root,
                atoms: o.atoms,
                eventDomains: o.events,
                uiSurfaces: o.uiSurfaces,
                serviceSeams: o.seams,
                createService: o.createService,
                toolName: o.toolName,
                target: o.target,
                config: o.config,
                missingFiles: check.missing,
            },
            null,
            2,
        ) + "\n",
    );
    if (check.missing.length > 0) process.exit(2);
}

await main();
