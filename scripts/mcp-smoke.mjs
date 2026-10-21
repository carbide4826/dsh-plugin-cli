// MCP 冒烟:真起 stdio server,逐个调三个 tool,并把生成物落盘。
//
// 为什么要有这条:CLI 那三路生成有 CI 覆盖,MCP 是新表面 —— 不测就等于「本地能跑、
// 提交后不知道还行不行」。这里复用 SDK 客户端起真实子进程(不是 in-memory),
// 顺带守住「stdout 是 JSON-RPC 通道,不能被别的输出污染」这条纪律。
//
// 用法:node scripts/mcp-smoke.mjs <输出目录> [轨]
// 失败即非零退出(CI 直接用退出码判成败)。
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

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
function payloadOf(res) {
    try {
        return JSON.parse(textOf(res));
    } catch {
        return null;
    }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const transport = new StdioClientTransport({
    command: "node",
    args: [resolve(repoRoot, "dist/cli.mjs"), "mcp", "--lang", "en"],
    cwd: outDir,
    stderr: "pipe",
});
const client = new Client({ name: "dshp-smoke", version: "0.0.0" });
await client.connect(transport);

console.log("tools:");
const tools = await client.listTools();
const names = tools.tools.map((t) => t.name).sort();
check("三个 tool 都在", JSON.stringify(names) === JSON.stringify(["dshp_create_plugin", "dshp_doctor", "dshp_list_scenarios"]), names.join(","));

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
check("计划态没建目录", !existsSync(resolve(outDir, "mcp-free")));

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
check("产物存在", existsSync(resolve(outDir, "mcp-free", "package.json")));
check("client 入口存在", existsSync(resolve(outDir, "mcp-free", "src", "client", "index.ts")));

console.log("dshp_create_plugin(错误路径):");
const bad = await client.callTool({
    name: "dshp_create_plugin",
    arguments: { mode: "free", dirName: "mcp-bad", uiSurfaces: ["settings-card"], config: "dynamic" },
});
check("界面位缺 ui 原子报错", bad.isError === true);
check("带稳定错误码", payloadOf(bad)?.code === "SURFACE_REQUIRES_ATOM", textOf(bad).slice(0, 120));

await client.close();
console.log(failures === 0 ? "MCP SMOKE PASS" : `MCP SMOKE FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
