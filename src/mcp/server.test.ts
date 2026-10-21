// MCP server 守门:tool 清单、schema 同源、三个 tool 的行为与错误码。
// 用内存传输(不 spawn 进程),跑得快且不依赖构建产物。
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./server";
import { ATOMS } from "../domain/atoms";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES } from "../domain/uiSurfaces";
import { SEAMS } from "../domain/seams";
import { SCENARIOS } from "../domain/scenarios";
import { TRACK_TARGETS } from "../domain/manifests";
import { listScenarioCases } from "../generate/scenarioCase";
import { getTrackManifest } from "../domain/manifests";

const tmpDirs: string[] = [];
afterEach(() => {
    for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function freshDir(): string {
    const d = mkdtempSync(join(tmpdir(), "dshp-mcp-"));
    tmpDirs.push(d);
    return d;
}

/** 起一个连上 server 的客户端 */
async function connect(options: { baseDir?: string } = {}) {
    const server = createMcpServer(options);
    const client = new Client({ name: "dshp-test", version: "0.0.0" });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientT), server.connect(serverT)]);
    return client;
}

/** 取 tool 返回的 JSON 文本(client 的返回类型是联合体,这里只关心 content) */
function payloadOf(res: unknown): Record<string, unknown> {
    const r = res as { content?: { text?: string }[] };
    return JSON.parse((r.content ?? []).map((c) => c.text ?? "").join("")) as Record<
        string,
        unknown
    >;
}

/** 取是否被标成失败 */
function isErrorOf(res: unknown): boolean {
    return (res as { isError?: boolean }).isError === true;
}

/** 取 tool 返回的原始文本 */
function textOf(res: unknown): string {
    const r = res as { content?: { text?: string }[] };
    return (r.content ?? []).map((c) => c.text ?? "").join("");
}

describe("MCP tool 清单", () => {
    it("四个 tool 都在,名字固定(宿主配置按名字引用)", async () => {
        const client = await connect();
        const tools = await client.listTools();
        expect(tools.tools.map((t) => t.name).sort()).toEqual([
            "dshp_create_plugin",
            "dshp_doctor",
            "dshp_list_scenarios",
            "dshp_spec",
        ]);
        await client.close();
    });
});

describe("依赖树(zod 单一实例)", () => {
    // zod 出第二实例 = MCP 的 schema 校验与 SDK 的 JSON Schema 生成各用一份 zod,
    // 症状是运行时校验行为与 tool 声明对不上(本仓在 cordis 上栽过同款:双实例致 typecheck 红)。
    it("zod 只装一份,且版本满足 SDK 的 peer 范围", () => {
        const repoRoot = join(import.meta.dirname, "../..");
        const sdkDir = realpathSync(
            join(repoRoot, "node_modules/@modelcontextprotocol/sdk"),
        );
        // SDK 实际解析到的 zod 与本包解析到的是同一个实例(peer 被去重)
        const sdkRequire = createRequire(join(sdkDir, "index.js"));
        const ourRequire = createRequire(join(repoRoot, "package.json"));
        const sdkZod = realpathSync(sdkRequire.resolve("zod/package.json"));
        const ourZod = realpathSync(ourRequire.resolve("zod/package.json"));
        expect(sdkZod, "SDK 与本包解析到了不同的 zod 实例").toBe(ourZod);

        const sdkPeer = (
            JSON.parse(
                readFileSync(join(sdkDir, "package.json"), "utf8"),
            ) as { peerDependencies?: { zod?: string } }
        ).peerDependencies?.zod;
        expect(sdkPeer, "SDK 没声明 zod peer 范围").toBeTruthy();

        const ours = (
            JSON.parse(
                readFileSync(join(repoRoot, "package.json"), "utf8"),
            ) as { dependencies?: { zod?: string } }
        ).dependencies?.zod;
        expect(ours, "本包没声明 zod 依赖").toBeTruthy();

        // peer 形如 "^3.25 || ^4.0":同 major 且下界不高于我们的版本即满足
        const ourVersion = (ours as string).replace(/^[^0-9]*/, "");
        const ourMajor = Number.parseInt(ourVersion.split(".")[0] ?? "0", 10);
        const ourMinor = Number.parseInt(ourVersion.split(".")[1] ?? "0", 10);
        const satisfied = (sdkPeer as string)
            .split("||")
            .some((clause) => {
                const major = Number.parseInt(
                    clause.trim().match(/\^(\d+)/)?.[1] ?? "",
                    10,
                );
                if (major !== ourMajor) return false;
                const min = Number.parseInt(
                    clause.trim().match(/\.(\d+)/)?.[1] ?? "0",
                    10,
                );
                return min <= ourMinor;
            });
        expect(satisfied, `zod ${ours} 不满足 SDK peer 范围 ${sdkPeer}`).toBe(true);
    });
});

describe("tool schema 与领域清单同源", () => {
    it("枚举取值直接从领域清单派生(手抄的清单必然过期)", async () => {
        const client = await connect();
        const tools = await client.listTools();
        const create = tools.tools.find((t) => t.name === "dshp_create_plugin")!;
        const props = create.inputSchema.properties as Record<string, { enum?: string[]; items?: { enum?: string[] } }>;

        expect(props.atoms!.items!.enum).toEqual(ATOMS.map((a) => a.id));
        expect(props.eventDomains!.items!.enum).toEqual(EVENT_DOMAINS.map((d) => d.id));
        expect(props.uiSurfaces!.items!.enum).toEqual(UI_SURFACES.map((s) => s.id));
        expect(props.serviceSeams!.items!.enum).toEqual(SEAMS.map((s) => s.id));
        expect(props.preset!.enum).toEqual(SCENARIOS.map((s) => s.id));
        expect(props.target!.enum).toEqual([...TRACK_TARGETS]);
        expect(props.mode!.enum).toEqual(["preset", "case", "free"]);
        await client.close();
    });

    it("案例枚举 = 两轨案例并集(案例集随轨不同,按轨校验放在处理函数)", async () => {
        const client = await connect();
        const tools = await client.listTools();
        const create = tools.tools.find((t) => t.name === "dshp_create_plugin")!;
        const props = create.inputSchema.properties as Record<string, { enum?: string[] }>;
        const expected = [
            ...new Set(
                TRACK_TARGETS.flatMap((target) =>
                    listScenarioCases(getTrackManifest(target)),
                ),
            ),
        ];
        expect(props.case!.enum).toEqual(expected);
        await client.close();
    });
});

describe("dshp_list_scenarios", () => {
    it("返回全量清单(预设 / 案例 / 能力 / 两轨版本)", async () => {
        const client = await connect();
        const res = await client.callTool({
            name: "dshp_list_scenarios",
            arguments: {},
        });
        const p = payloadOf(res);
        expect(p.ok).toBe(true);
        expect((p.presets as unknown[]).length).toBe(SCENARIOS.length);
        expect((p.atoms as unknown[]).length).toBe(ATOMS.length);
        expect((p.uiSurfaces as unknown[]).length).toBe(UI_SURFACES.length);
        expect((p.tracks as unknown[]).length).toBe(TRACK_TARGETS.length);
        await client.close();
    });

    it("scope 能收窄;target 能只看一轨", async () => {
        const client = await connect();
        const only = payloadOf(
            await client.callTool({
                name: "dshp_list_scenarios",
                arguments: { scope: "cases", target: "next" },
            }),
        );
        expect(only.scope).toBe("cases");
        expect(only.atoms).toBeUndefined();
        const cases = only.cases as { target: string }[];
        expect(cases.length).toBeGreaterThan(0);
        expect(cases.every((c) => c.target === "next")).toBe(true);
        await client.close();
    });
});

describe("dshp_create_plugin", () => {
    it("缺省只算计划,不落盘(显式确认后写盘的前提)", async () => {
        const base = freshDir();
        const client = await connect({ baseDir: base });
        const p = payloadOf(
            await client.callTool({
                name: "dshp_create_plugin",
                arguments: {
                    mode: "free",
                    dirName: "m1",
                    atoms: ["tool"],
                    toolName: "query_orders",
                },
            }),
        );
        expect(p.ok).toBe(true);
        expect(p.written).toBe(false);
        expect((p.files as string[]).length).toBeGreaterThan(0);
        expect(existsSync(join(base, "m1"))).toBe(false);
        await client.close();
    });

    it("显式 dryRun=false 才落盘", async () => {
        const base = freshDir();
        const client = await connect({ baseDir: base });
        const p = payloadOf(
            await client.callTool({
                name: "dshp_create_plugin",
                arguments: {
                    mode: "free",
                    dirName: "m2",
                    atoms: ["tool"],
                    toolName: "query_orders",
                    dryRun: false,
                },
            }),
        );
        expect(p.written).toBe(true);
        expect(existsSync(join(base, "m2", "package.json"))).toBe(true);
        await client.close();
    });

    it("非法 id 被 schema 拦在门外(模型拿不到过期 id)", async () => {
        const client = await connect();
        const res = await client.callTool({
            name: "dshp_create_plugin",
            arguments: { mode: "free", atoms: ["nope"] },
        });
        expect(isErrorOf(res)).toBe(true);
        // schema 层拦下的报错是协议错误文本,不是本仓的 JSON 载荷
        expect(textOf(res)).toMatch(/Invalid option/);
        await client.close();
    });

    it("领域错误带稳定 code(不是本地化句子)", async () => {
        const base = freshDir();
        const client = await connect({ baseDir: base });
        mkdirSync(join(base, "taken"), { recursive: true });
        const res = await client.callTool({
            name: "dshp_create_plugin",
            arguments: { mode: "free", dirName: "taken", atoms: ["tool"] },
        });
        expect(isErrorOf(res)).toBe(true);
        expect(payloadOf(res).code).toBe("DIR_EXISTS");
        await client.close();
    });

    it("界面位缺依赖原子报 SURFACE_REQUIRES_ATOM", async () => {
        const client = await connect();
        const res = await client.callTool({
            name: "dshp_create_plugin",
            arguments: {
                mode: "free",
                dirName: "m3",
                uiSurfaces: ["settings-card"],
                config: "dynamic",
            },
        });
        expect(isErrorOf(res)).toBe(true);
        expect(payloadOf(res).code).toBe("SURFACE_REQUIRES_ATOM");
        await client.close();
    });

    it("精选案例整目录拷贝,产物与 CLI 同源", async () => {
        const base = freshDir();
        const client = await connect({ baseDir: base });
        const p = payloadOf(
            await client.callTool({
                name: "dshp_create_plugin",
                arguments: { mode: "case", case: "quick-tool", dirName: "m4", dryRun: false },
            }),
        );
        expect(p.written).toBe(true);
        expect(existsSync(join(base, "m4", "package.json"))).toBe(true);
        expect(existsSync(join(base, "m4", "cordis.patch.yml"))).toBe(true);
        await client.close();
    });

    it("lang 参数决定生成物语言(宿主 spawn 子进程不继承 LANG,只能显式给)", async () => {
        const base = freshDir();
        const client = await connect({ baseDir: base });
        await client.callTool({
            name: "dshp_create_plugin",
            arguments: {
                mode: "free",
                dirName: "m5",
                atoms: ["tool"],
                toolName: "t",
                dryRun: false,
                lang: "zh",
            },
        });
        const readme = readFileSync(join(base, "m5", "README.md"), "utf8");
        expect(readme).toContain("插件入口");
        await client.close();
    });
});

describe("dshp_doctor", () => {
    it("体检结论结构完整(node / pnpm / 目录可写 / 两轨素材自检)", async () => {
        const client = await connect();
        const p = payloadOf(
            await client.callTool({ name: "dshp_doctor", arguments: {} }),
        );
        const checks = p.checks as { id: string; ok: boolean; detail: string }[];
        const ids = checks.map((c) => c.id);
        expect(ids).toContain("node-version");
        expect(ids).toContain("package-manager");
        expect(ids).toContain("cwd-writable");
        expect(ids).toContain("track-latest");
        expect(ids).toContain("track-next");
        for (const c of checks) {
            expect(c.detail.length, `${c.id} 没有结论文案`).toBeGreaterThan(0);
        }
        await client.close();
    });

    it("两轨的素材与生成管线自检必须过(素材漂移会在这里暴露)", async () => {
        const client = await connect();
        const p = payloadOf(
            await client.callTool({ name: "dshp_doctor", arguments: {} }),
        );
        const checks = p.checks as { id: string; ok: boolean }[];
        for (const id of ["track-latest", "track-next"]) {
            expect(checks.find((c) => c.id === id)?.ok, `${id} 自检未过`).toBe(true);
        }
        await client.close();
    });
});
