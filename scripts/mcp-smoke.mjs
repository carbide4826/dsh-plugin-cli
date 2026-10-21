// MCP 冒烟:真起 stdio server,逐个调四个 tool,并把生成物落盘。
//
// 为什么要有这条:CLI 那几路生成有 CI 覆盖,MCP 是新表面 —— 不测就等于「本地能跑、
// 提交后不知道还行不行」。这里复用 SDK 客户端起真实子进程(不是 in-memory),
// 顺带守住「stdout 是 JSON-RPC 通道,不能被别的输出污染」这条纪律。
//
// 末尾还验证「访谈 → 规格 → 两种编译形态 → 产物」:dshp_spec 编译出的 CLI 参数跑一遍、
// dshp_create_plugin 的入参跑一遍,两者产物须逐字节一致(证明规格到 CLI 的映射没走样)。
//
// 用法:node scripts/mcp-smoke.mjs <输出目录> [轨]
// 失败即非零退出(CI 直接用退出码判成败)。
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? "mcp-smoke-out");
const track = process.argv[3] ?? "latest";
const repoRoot = resolve(import.meta.dirname, "..");

let failures = 0;
function check(name, cond, detail = "") {
    if (cond) {
        console.log(`  ok   ${name}`);
    } else {
        failures += 1;
        console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    }
}

function textOf(res) {
    return (res.content ?? []).map((c) => c.text ?? "").join("");
}

/** 递归列文件(相对路径) */
function walk(dir, base = dir, out = []) {
    for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) walk(full, base, out);
        else out.push(relative(base, full));
    }
    return out.sort();
}

/** 比两棵目录树;dev.patch.yml 含目标目录绝对路径,跳过 */
function compareTrees(a, b) {
    const fa = walk(a);
    const fb = walk(b);
    if (JSON.stringify(fa) !== JSON.stringify(fb)) {
        return `文件清单不同:${fa.length} vs ${fb.length}`;
    }
    for (const f of fa) {
        if (f === "dev.patch.yml") continue;
        const ca = execFileSync("sh", ["-c", `cat "${join(a, f)}"`], { encoding: "utf8" });
        const cb = execFileSync("sh", ["-c", `cat "${join(b, f)}"`], { encoding: "utf8" });
        if (ca !== cb) return `内容不同:${f}`;
    }
    return null;
}
function payloadOf(res) {
    try {
        return JSON.parse(textOf(res));
    } catch {
        return null;
    }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// server 的 cwd = tool-side:tool 形态生成的工程建在这里(与 CLI 形态分处不同父目录,
// 目录名相同 ⇒ 身份相同 ⇒ 产物可比)
const toolSide = join(outDir, "tool-side");
mkdirSync(toolSide, { recursive: true });

const transport = new StdioClientTransport({
    command: "node",
    args: [resolve(repoRoot, "dist/cli.mjs"), "mcp", "--lang", "en"],
    cwd: toolSide,
    stderr: "pipe",
});
const client = new Client({ name: "dshp-smoke", version: "0.0.0" });
await client.connect(transport);

console.log("tools:");
const tools = await client.listTools();
const names = tools.tools.map((t) => t.name).sort();
check(
    "四个 tool 都在",
    JSON.stringify(names) ===
        JSON.stringify(["dshp_create_plugin", "dshp_doctor", "dshp_list_scenarios", "dshp_spec"]),
    names.join(","),
);

console.log("dshp_list_scenarios:");
const list = payloadOf(await client.callTool({ name: "dshp_list_scenarios", arguments: {} }));
check("返回 ok", list?.ok === true);
check("有预设", (list?.presets ?? []).length > 0);
check("有案例", (list?.cases ?? []).length > 0);
check("有界面位", (list?.uiSurfaces ?? []).length > 0);
check("界面位带依赖原子", (list?.uiSurfaces ?? []).every((s) => Array.isArray(s.requires)));

console.log("dshp_doctor:");
const doctor = payloadOf(await client.callTool({ name: "dshp_doctor", arguments: { target: track } }));
check("返回体检结论", Array.isArray(doctor?.checks) && doctor.checks.length > 0);
const trackCheck = (doctor?.checks ?? []).find((c) => c.id === `track-${track}`);
check(`轨 ${track} 素材与生成管线自检通过`, trackCheck?.ok === true, JSON.stringify(trackCheck));

console.log("dshp_create_plugin(计划态):");
const plan = payloadOf(
    await client.callTool({
        name: "dshp_create_plugin",
        arguments: {
            mode: "free",
            dirName: "mcp-free",
            atoms: ["tool", "ui"],
            uiSurfaces: ["settings-card"],
            config: "dynamic",
            toolName: "query_orders",
            target: track,
            lang: "en",
        },
    }),
);
check("返回 ok", plan?.ok === true);
check("计划态未落盘", plan?.written === false);
check("计划态列出了文件", (plan?.files ?? []).length > 0);
check("计划态没建目录", !existsSync(join(toolSide, "mcp-free")));

console.log("dshp_create_plugin(落盘):");
const written = payloadOf(
    await client.callTool({
        name: "dshp_create_plugin",
        arguments: {
            mode: "free",
            dirName: "mcp-free",
            atoms: ["tool", "ui"],
            uiSurfaces: ["settings-card"],
            config: "dynamic",
            toolName: "query_orders",
            target: track,
            lang: "en",
            dryRun: false,
        },
    }),
);
check("返回 ok", written?.ok === true);
check("已落盘", written?.written === true);
check("产物存在", existsSync(join(toolSide, "mcp-free", "package.json")));
check("client 入口存在", existsSync(join(toolSide, "mcp-free", "src", "client", "index.ts")));

console.log("dshp_create_plugin(错误路径):");
const bad = await client.callTool({
    name: "dshp_create_plugin",
    arguments: { mode: "free", dirName: "mcp-bad", uiSurfaces: ["settings-card"], config: "dynamic" },
});
check("界面位缺 ui 原子报错", bad.isError === true);
check("带稳定错误码", payloadOf(bad)?.code === "SURFACE_REQUIRES_ATOM", textOf(bad).slice(0, 120));

console.log("dshp_spec(访谈清单 + 缺项判定):");
const emptySpec = payloadOf(await client.callTool({ name: "dshp_spec", arguments: {} }));
check("返回清单", Array.isArray(emptySpec?.steps) && emptySpec.steps.length > 0);
check("还没答完,不许开跑", emptySpec?.ready === false);
check("给了第一问", Boolean(emptySpec?.next?.ask));
check("每步都带问法", emptySpec.steps.every((s) => typeof s.ask === "string" && s.ask.length > 0));
check(
    "可跳过的步骤都说了跳过意味着什么",
    emptySpec.steps.filter((s) => s.required === false).every((s) => Boolean(s.skip)),
);

const interviewSpec = {
    need: "查订单",
    route: "custom",
    atoms: ["tool", "ui"],
    uiSurfaces: ["settings-card"],
    toolName: "query_orders",
    config: "dynamic",
    dirName: "spec-free",
    target: track,
    lang: "en",
};
const readySpec = payloadOf(
    await client.callTool({ name: "dshp_spec", arguments: { spec: interviewSpec } }),
);
check("收齐后 ready 为 true", readySpec?.ready === true);
check("编译出了 CLI 参数", Array.isArray(readySpec?.cliArgs) && readySpec.cliArgs.length > 0);
check("编译出了 create 入参", readySpec?.createArgs?.mode === "free");

// 两种编译形态各生成一次,再逐字节比对产物。
// 身份必须相同(目录名一样)才有可比性,所以放在**不同父目录**下各跑一次:
//   CLI 形态 —— 在 cli-side 目录里跑编译出的参数
//   tool 形态 —— MCP server 的 cwd 是 tool-side,工程建在那边
// 唯一允许不同的是 dev.patch.yml(内含目标目录绝对路径),比对时跳过。
const cliSide = join(outDir, "cli-side");
mkdirSync(cliSide, { recursive: true });
execFileSync("node", [resolve(repoRoot, "dist/cli.mjs"), "create", ...readySpec.cliArgs], {
    cwd: cliSide,
    stdio: "pipe",
});
const viaCli = join(cliSide, "spec-free");
const toolRes = await client.callTool({
    name: "dshp_create_plugin",
    arguments: { ...readySpec.createArgs, dryRun: false },
});
const toolJson = payloadOf(toolRes);
const viaTool = join(toolSide, "spec-free");
check("CLI 形态产出了工程", existsSync(join(viaCli, "package.json")));
check("tool 形态产出了工程", existsSync(join(viaTool, "package.json")));
check("tool 形态没报错", toolJson?.ok === true, textOf(toolRes).slice(0, 160));

const diff = compareTrees(viaCli, viaTool);
check("两种编译形态的产物逐字节一致", diff === null, diff ?? "");

await client.close();
console.log(failures === 0 ? "MCP SMOKE PASS" : `MCP SMOKE FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
