// dshp_doctor:体检生成环境 —— 这台机器能不能把生成物真正跑起来。
//
// 定位:生成器只管把文件写出来,能不能装、能不能编译、能不能起宿主,
// 取决于本机的 node / pnpm / dsh CLI / 素材树完整性。agent 拿到体检报告
// 就能在生成前就知道「装不上」这类问题,而不是等 install 失败。
//
// 两条轨都做一次「生成计划自检」(不落盘):能过说明素材与生成器没漂移
// (占位符解析不了、素材缺失都会在这里暴露)。
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execFileSync } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { resolve } from "node:path";
import { TRACK_TARGETS, getTrackManifest, type TrackTarget } from "../../domain/manifests";
import { planCreate, resolveCreate } from "../../core/create";
import { listScenarioCases } from "../../generate/scenarioCase";
import { templatesRoot } from "../../generate/project";
import { isDshpError } from "../../core/errors";
import { doctorInputShape } from "../schema";
import { errResult, okResult } from "../result";
import pkgJson from "../../../package.json" with { type: "json" };

interface DoctorArgs {
    target?: string;
}

/** 一条体检结论 */
interface Check {
    id: string;
    ok: boolean;
    detail: string;
    data?: Record<string, unknown>;
}

/** 版本号比较(a < b → 负) */
function compareVersions(a: string, b: string): number {
    const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
    const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0) return d;
    }
    return 0;
}

/**
 * node 版本是否满足 engines 声明。
 * 只认本仓实际用到的两种写法( caret / 大于等于 ),不引三方 semver:
 * 引擎版本判定的准确度不值一个依赖,而写全量 semver 解析反而更容易出错。
 */
function satisfiesNode(version: string, range: string): boolean {
    return range.split("||").some((part) => {
        const p = part.trim();
        if (p.startsWith(">=")) {
            return compareVersions(version, p.slice(2).trim()) >= 0;
        }
        if (p.startsWith("^")) {
            const base = p.slice(1).trim();
            const baseMajor = base.split(".")[0];
            const major = version.split(".")[0];
            if (major !== baseMajor) return false;
            return compareVersions(version, base) >= 0;
        }
        return false;
    });
}

/** 探一个可执行文件:是否装了、装的是什么版本 */
function probeCommand(
    cmd: string,
    args: string[],
): { installed: boolean; output?: string } {
    try {
        const out = execFileSync(cmd, args, {
            encoding: "utf8",
            timeout: 8000,
            stdio: ["ignore", "pipe", "pipe"],
        });
        return { installed: true, output: out.trim().split("\n")[0] };
    } catch (err) {
        // ENOENT = 根本没装;别的错 = 装了但这个参数不认(仍算已安装)
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return { installed: false };
        const stdout = (err as { stdout?: string }).stdout ?? "";
        const first = stdout.trim().split("\n")[0];
        return { installed: true, ...(first ? { output: first } : {}) };
    }
}

/** 单轨体检 */
function checkTrack(target: TrackTarget): Check {
    const manifest = getTrackManifest(target);
    // 素材树:找不到就是发布事故(包没带 templates)
    let root: string;
    try {
        root = templatesRoot(target);
    } catch (err) {
        return {
            id: `track-${target}`,
            ok: false,
            detail: `素材树缺失:${isDshpError(err) ? err.code : "unknown"}`,
            data: { target, dshVersion: manifest.version },
        };
    }

    // 生成计划自检:不落盘跑一遍生成管线,占位符漂移/素材缺失会在这里抛
    try {
        const resolved = resolveCreate(
            {
                mode: "free",
                atoms: ["tool", "ui"],
                uiSurfaces: ["settings-card"],
                config: "dynamic",
                target,
            },
            resolve(process.cwd(), "__dshp_doctor_probe__"),
        );
        const files = planCreate(resolved);
        return {
            id: `track-${target}`,
            ok: true,
            detail: `素材树与生成管线自检通过(计划 ${files.length} 个文件)`,
            data: {
                target,
                dshVersion: manifest.version,
                cordisPeer: manifest.cordisPeer,
                schemasteryVersion: manifest.schemasteryVersion,
                settingsSlot: manifest.settingsSlot,
                templatesRoot: root,
                cases: listScenarioCases(manifest),
                plannedFiles: files.length,
            },
        };
    } catch (err) {
        return {
            id: `track-${target}`,
            ok: false,
            detail: `生成管线自检失败:${isDshpError(err) ? err.code : String(err)}`,
            data: { target, dshVersion: manifest.version, templatesRoot: root },
        };
    }
}

export function registerDoctor(server: McpServer): void {
    server.registerTool(
        "dshp_doctor",
        {
            title: "Diagnose the DSH plugin generation environment",
            description:
                "体检本机的插件生成环境:node 版本是否符合要求、pnpm 是否可用、dsh CLI 是否装了、" +
                "两轨素材树与生成管线是否自洽(占位符漂移会在这里暴露)、当前目录是否可写。" +
                "生成项目之前先跑一次,能在装依赖之前发现问题。",
            inputSchema: doctorInputShape(),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        async (args: DoctorArgs) => {
            try {
                const checks: Check[] = [];
                const cwd = process.cwd();

                // node 版本
                const nodeVersion = process.versions.node;
                const engineRange = pkgJson.engines.node;
                const nodeOk = satisfiesNode(nodeVersion, engineRange);
                checks.push({
                    id: "node-version",
                    ok: nodeOk,
                    detail: nodeOk
                        ? `node ${nodeVersion} 满足 ${engineRange}`
                        : `node ${nodeVersion} 不满足 ${engineRange}`,
                    data: { version: nodeVersion, required: engineRange },
                });

                // pnpm
                const pnpm = probeCommand("pnpm", ["--version"]);
                checks.push({
                    id: "package-manager",
                    ok: pnpm.installed,
                    detail: pnpm.installed
                        ? `pnpm ${pnpm.output ?? "(版本未知)"}`
                        : "pnpm 不在 PATH 上(生成物用 pnpm,装不上依赖)",
                    data: { installed: pnpm.installed, version: pnpm.output },
                });

                // dsh CLI:全局 PATH 与项目内 node_modules/.bin 各看一次
                const dsh = probeCommand("dsh", ["--version"]);
                const localDsh = resolve(cwd, "node_modules/.bin/dsh");
                const localExists = existsSync(localDsh);
                checks.push({
                    id: "dsh-cli",
                    ok: dsh.installed || localExists,
                    detail: dsh.installed
                        ? `dsh CLI 可用${dsh.output ? `(${dsh.output})` : ""}`
                        : localExists
                          ? `dsh CLI 在项目内 node_modules/.bin(全局没有)`
                          : "dsh CLI 不在 PATH 上(生成物要靠它起宿主;装 @deepseek-ai/dsh 或用 pnpm dlx)",
                    data: {
                        onPath: dsh.installed,
                        version: dsh.output,
                        localBinary: localExists ? localDsh : null,
                    },
                });

                // 当前目录可写(生成目录要建在这)
                let cwdWritable = false;
                try {
                    accessSync(cwd, constants.W_OK);
                    cwdWritable = true;
                } catch {
                    cwdWritable = false;
                }
                checks.push({
                    id: "cwd-writable",
                    ok: cwdWritable,
                    detail: cwdWritable
                        ? `当前目录可写:${cwd}`
                        : `当前目录不可写:${cwd}`,
                    data: { cwd },
                });

                // 两轨素材与生成管线
                const targets = args.target
                    ? [args.target as TrackTarget]
                    : [...TRACK_TARGETS];
                for (const target of targets) {
                    checks.push(checkTrack(target));
                }

                const failed = checks.filter((c) => !c.ok);
                return okResult({
                    ok: failed.length === 0,
                    cwd,
                    checks,
                    summary: failed.length
                        ? `${failed.length} 项未通过:${failed.map((c) => c.id).join(", ")}`
                        : "全部通过",
                });
            } catch (err) {
                return errResult(err);
            }
        },
    );
}
