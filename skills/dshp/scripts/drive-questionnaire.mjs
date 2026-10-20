#!/usr/bin/env node
// drive-questionnaire.mjs — 用结构化参数驱动 dshp 的交互问卷,产出「纯生成器产物」
//
// 为什么需要它:dshp 的自由原子组合(任意勾选原子/事件域/界面位/缝)只在交互问卷里能表达,
// CLI 没有对应 flag。手工驱动问卷要逆向 clack 的按键语义(select/multiselect 的下移别名、
// 空格切换、text 预填值的退格清除),一次几十次试错;本脚本把这些固化下来。
//
// 用法:
//   node drive-questionnaire.mjs --dir my-orders --target next \
//     --atoms tool,ui --surfaces settings-card --tool-name query_orders \
//     [--events tools,agent] [--seams llm] [--create-service] \
//     [--description "..."] [--author "..."] [--pkg-name x] [--plugin-id y] \
//     [--pkg-position bundle|library] [--config none|static|dynamic] [--lang zh|en]
//
// 退出码:0 成功(并打印 JSON 摘要)· 1 参数非法 · 2 交互流程异常(超时/步骤不匹配)
//
// 依赖:仅 Node.js 内置模块(无第三方包)。按键用管道喂给 CLI 的 stdin,靠 stdout 里的
// 提示语文本做步进同步 —— 提示语随 CLI 语言变化,故默认按 zh 标记匹配,--lang en 时改用
// 英文标记(见 MARKERS)。

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// 脚本随 npm 包发布:skills/dshp/scripts → 上溯三层即包根,dist/cli.mjs 是同版本产物
const PKG_ROOT = resolve(HERE, "../../..");
const BUNDLED_CLI = join(PKG_ROOT, "dist", "cli.mjs");

// ---- 选项顺序与初始勾选(与 src/domain/{atoms,events,uiSurfaces,seams}.ts 同步;
//      本脚本与模板同版本发布,升级 dshp 时同步这两处) ----
const ATOMS = ["tool", "events", "service", "ui", "protocol"];
const ATOM_PRESELECTED = new Set(["tool"]); // atoms 清单里 default:true 的项
const EVENT_DOMAINS = ["tools", "agent", "session", "approval", "fs", "settings"];
const UI_SURFACES = [
    "settings-card",
    "chat-node",
    "input-dock",
    "sidebar",
    "tool-view",
    "session-header",
];
// 服务问卷的选项序:首项是「新建服务」哨兵,末项「其他」是哨兵(不进数据)
const SERVICE_OPTIONS = [
    "__create__",
    "llm",
    "systemPrompt",
    "subagents",
    "web",
    "commands",
    "storage",
    "__more__",
];

const MARKERS = {
    zh: {
        dir: "项目目录",
        description: "一句话描述",
        author: "作者",
        pkgName: "npm 包名",
        pluginId: "插件 id",
        target: "配套哪一代",
        start: "从哪里开始",
        position: "这个包的定位",
        atoms: "勾选插件能力",
        toolName: "工具名",
        events: "事件域 Events",
        ui: "界面位 UI surfaces",
        service: "服务 Service",
        capabilityConfirm: "确认这份配置",
        config: "配置方式",
        finalConfirm: "按以上答案生成项目",
    },
    en: {
        dir: "Project directory",
        description: "一句话描述",
        author: "作者",
        pkgName: "npm 包名",
        pluginId: "插件 id",
        target: "配套哪一代",
        start: "从哪里开始",
        position: "这个包的定位",
        atoms: "勾选插件能力",
        toolName: "工具名",
        events: "事件域 Events",
        ui: "界面位 UI surfaces",
        service: "服务 Service",
        capabilityConfirm: "确认这份配置",
        config: "配置方式",
        finalConfirm: "按以上答案生成项目",
    },
};

const KEYS = {
    enter: "\r",
    space: " ",
    down: "j", // clack 的下移别名;管道下 arrow 序列也可用,此处用别名更稳
    backspace: "\x7f",
};

function parseArgs(argv) {
    const out = {
        dir: "",
        target: "latest",
        atoms: [],
        events: [],
        uiSurfaces: [],
        seams: [],
        createService: false,
        toolName: "",
        description: "",
        author: "",
        pkgName: "",
        pluginId: "",
        pkgPosition: "bundle",
        config: "static",
        lang: "zh",
        cli: "",
        dryRun: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => {
            const v = argv[++i];
            if (v === undefined) throw new Error(`${a} 缺参数`);
            return v;
        };
        switch (a) {
            case "--dir": out.dir = next(); break;
            case "--target": out.target = next(); break;
            case "--atoms": out.atoms = next().split(",").map((s) => s.trim()).filter(Boolean); break;
            case "--events": out.events = next().split(",").map((s) => s.trim()).filter(Boolean); break;
            case "--surfaces": out.uiSurfaces = next().split(",").map((s) => s.trim()).filter(Boolean); break;
            case "--seams": out.seams = next().split(",").map((s) => s.trim()).filter(Boolean); break;
            case "--create-service": out.createService = true; break;
            case "--tool-name": out.toolName = next(); break;
            case "--description": out.description = next(); break;
            case "--author": out.author = next(); break;
            case "--pkg-name": out.pkgName = next(); break;
            case "--plugin-id": out.pluginId = next(); break;
            case "--pkg-position": out.pkgPosition = next(); break;
            case "--config": out.config = next(); break;
            case "--lang": out.lang = next(); break;
            case "--cli": out.cli = next(); break;
            case "--dry-run": out.dryRun = true; break;
            default: throw new Error(`未知参数:${a}`);
        }
    }
    return out;
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
    for (const s of o.seams) if (!SERVICE_OPTIONS.includes(s) || s.startsWith("__")) bad(`--seams 含未知缝:${s}`);
    // 硬约束(与 CLI 问卷一致):勾了 events/ui/service 原子就得给出对应清单项
    if (o.atoms.includes("events") && o.events.length === 0) bad("勾了 events 原子,须用 --events 给出事件域");
    if (o.atoms.includes("ui") && o.uiSurfaces.length === 0) bad("勾了 ui 原子,须用 --surfaces 给出界面位");
    if (o.atoms.includes("service") && o.seams.length === 0 && !o.createService) {
        bad("勾了 service 原子,须用 --seams 给出缝或用 --create-service 新建服务");
    }
    // 界面位依赖原子:tool-view 必须同勾 tool(CLI 侧会重问,这里直接拦)
    if (o.uiSurfaces.includes("tool-view") && !o.atoms.includes("tool")) {
        bad("界面位 tool-view 必须同勾 tool 原子");
    }
    // 设置卡片必须有配置
    if (o.uiSurfaces.includes("settings-card") && o.config === "none") {
        bad("界面位 settings-card 不能配 config=none");
    }
    if (o.atoms.includes("tool") && !o.toolName) bad("勾了 tool 原子,须用 --tool-name 给出工具名");
}

/** 多选步骤的按键序列:走到每个选项位,按需空格切换,最后回车 */
function multiselectKeys(options, wanted, preselected) {
    const keys = [];
    options.forEach((opt, idx) => {
        if (idx > 0) keys.push(KEYS.down);
        const want = wanted.has(opt);
        const has = preselected.has(opt);
        if (want !== has) keys.push(KEYS.space);
    });
    keys.push(KEYS.enter);
    return keys;
}

/** 把按键序列摊平成一条写给 stdin 的字符串 */
function flatten(keys) {
    return keys.join("");
}

/** 规划整个交互流程的步骤序列(每步 = 等待标记 + 发送按键) */
function planSteps(o, m) {
    const steps = [];
    const push = (marker, keys) => steps.push({ marker, keys: Array.isArray(keys) ? keys : [keys] });

    push(m.dir, KEYS.enter); // 目录名:回车用默认值(= --dir)
    push(m.description, o.description ? [o.description, KEYS.enter] : [KEYS.enter]);
    push(m.author, o.author ? [o.author, KEYS.enter] : [KEYS.enter]);
    push(m.pkgName, KEYS.enter); // 包名默认 = 目录名
    push(m.pluginId, KEYS.enter); // 插件 id 默认 = 目录名
    push(m.target, KEYS.enter); // 轨的初值由 --target 决定,回车即锁定

    // 起点:选项序 [精选案例, 原子组合] → 下移一格选「原子组合」
    push(m.start, [KEYS.down, KEYS.enter]);

    // 包定位:选项序 [插件包(bundle), 库包(library)]
    push(m.position, o.pkgPosition === "library" ? [KEYS.down, KEYS.enter] : [KEYS.enter]);

    // 原子多选:初始勾选 = 清单里 default:true 的项
    push(m.atoms, multiselectKeys(ATOMS, new Set(o.atoms), ATOM_PRESELECTED));

    if (o.atoms.includes("tool")) {
        // 工具名输入框预填了 example_tool,先退格清空再写新名
        const clear = new Array(32).fill(KEYS.backspace);
        push(m.toolName, [...clear, o.toolName, KEYS.enter]);
    }
    if (o.atoms.includes("events")) {
        push(m.events, multiselectKeys(EVENT_DOMAINS, new Set(o.events), new Set()));
    }
    if (o.atoms.includes("ui")) {
        push(m.ui, multiselectKeys(UI_SURFACES, new Set(o.uiSurfaces), new Set()));
    }
    if (o.atoms.includes("service")) {
        const wanted = new Set(o.seams);
        if (o.createService) wanted.add("__create__");
        push(m.service, multiselectKeys(SERVICE_OPTIONS, wanted, new Set()));
    }

    push(m.capabilityConfirm, KEYS.enter); // 能力预览 → 直接生成
    // 配置方式:选项序 [静态, 动态, 无(有设置卡片时被禁用)]
    const configKeys = o.config === "none" ? [KEYS.down, KEYS.down, KEYS.enter]
        : o.config === "dynamic" ? [KEYS.down, KEYS.enter]
        : [KEYS.enter];
    push(m.config, configKeys);

    push(m.finalConfirm, KEYS.enter);
    return steps;
}

function resolveCli(o) {
    if (o.cli) return { cmd: "node", args: [resolve(o.cli)] };
    if (existsSync(BUNDLED_CLI)) return { cmd: "node", args: [BUNDLED_CLI] };
    return { cmd: "npx", args: ["-y", "create-dsh-plugin-cli"] };
}

/** 驱动 CLI:按标记逐段喂键 */
function drive(o, steps) {
    return new Promise((resolvePromise, rejectPromise) => {
        const cli = resolveCli(o);
        const args = [...cli.args, "create", o.dir, "--target", o.target, "--lang", o.lang];
        const child = spawn(cli.cmd, args, { stdio: ["pipe", "pipe", "pipe"] });

        let buffer = "";
        let stderr = "";
        let index = 0;
        let settled = false;

        const fail = (message) => {
            if (settled) return;
            settled = true;
            clearInterval(timer);
            child.kill("SIGKILL");
            rejectPromise(new Error(`${message}\n--- CLI stderr ---\n${stderr.slice(-2000)}`));
        };
        const succeed = (code) => {
            if (settled) return;
            settled = true;
            clearInterval(timer);
            resolvePromise(code ?? 0);
        };

        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            buffer += chunk;
            while (index < steps.length && buffer.includes(steps[index].marker)) {
                const step = steps[index];
                buffer = ""; // 清空:只认下一段新输出,避免命中重绘里的旧标记
                child.stdin.write(flatten(step.keys));
                index++;
            }
            if (index >= steps.length) {
                // 全部步骤已喂完,等进程自己收尾
                child.stdin.end();
            }
        });
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });
        child.on("error", (err) => fail(`无法启动 CLI(${cli.cmd} ${cli.args.join(" ")}):${err.message}`));
        child.on("exit", (code) => {
            if (index < steps.length) {
                fail(`交互流程未走完:停在第 ${index + 1}/${steps.length} 步(标记「${steps[index]?.marker}」)`);
                return;
            }
            if (code !== 0) {
                fail(`CLI 退出码 ${code}`);
                return;
            }
            succeed(0);
        });

        const timer = setInterval(() => {
            if (index >= steps.length) return;
            fail(`等待提示语「${steps[index].marker}」超时`);
        }, 120000);
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

    const marker = MARKERS[o.lang] ?? MARKERS.zh;
    const steps = planSteps(o, marker);

    if (o.dryRun) {
        process.stdout.write(
            JSON.stringify(
                {
                    dryRun: true,
                    dir: o.dir,
                    target: o.target,
                    steps: steps.map((s) => ({ marker: s.marker, keys: s.keys })),
                },
                null,
                2,
            ) + "\n",
        );
        return;
    }

    try {
        await drive(o, steps);
    } catch (err) {
        process.stderr.write(`${err.message}\n`);
        process.exit(2);
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
