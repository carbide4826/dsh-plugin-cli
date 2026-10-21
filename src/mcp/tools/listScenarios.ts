// dshp_list_scenarios:一览「能选什么」——预设、精选案例、能力清单。
//
// 为什么叫 scenarios 却也返回能力清单:模型要挑界面位,必须同时知道「有哪些界面位」
// 和「它依赖哪些原子」,后者是硬约束(缺原子就生成不出注册键,界面位静默不渲染)。
// 只给案例 id 而不给依赖,模型只能靠试错。所以这一个工具给全,scope 只做收窄。
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describeCatalog } from "../../core/describe";
import { listScenariosInputShape } from "../schema";
import { errResult, okResult } from "../result";
import { resolveTrackTarget, type TrackTarget } from "../../domain/manifests";
import { DshpError } from "../../core/errors";

interface ListArgs {
    scope?: "all" | "presets" | "cases" | "capabilities";
    target?: string;
}

export function registerListScenarios(server: McpServer): void {
    server.registerTool(
        "dshp_list_scenarios",
        {
            title: "List presets, curated cases and capabilities",
            description:
                "列出可用的生成素材与能力:预设组合(能力被锁定)、精选案例(整目录拷贝)、" +
                "能力清单(原子/事件域/界面位/缝,界面位带宿主包、槽位键与依赖原子)。" +
                "两轨(latest/next)的案例集与版本配套不同,可按 target 收窄。",
            inputSchema: listScenariosInputShape(),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        async (args: ListArgs) => {
            try {
                // 轨过滤:非法轨名报错,不静默回落
                let targets: TrackTarget[] | undefined;
                if (args.target !== undefined) {
                    const m = resolveTrackTarget(args.target);
                    if (!m) {
                        return errResult(
                            new DshpError("UNKNOWN_TARGET", {
                                value: args.target,
                                targets: "latest, next",
                            }),
                        );
                    }
                    targets = [m.target];
                }

                const scope = args.scope ?? "all";
                const catalog = describeCatalog(targets);

                if (scope === "presets") {
                    return okResult({ ok: true, scope, presets: catalog.presets });
                }
                if (scope === "cases") {
                    return okResult({ ok: true, scope, cases: catalog.cases });
                }
                if (scope === "capabilities") {
                    return okResult({
                        ok: true,
                        scope,
                        atoms: catalog.atoms,
                        eventDomains: catalog.eventDomains,
                        uiSurfaces: catalog.uiSurfaces,
                        seams: catalog.seams,
                        configModes: catalog.configModes,
                        pkgPositions: catalog.pkgPositions,
                    });
                }
                return okResult({ ok: true, scope, ...catalog });
            } catch (err) {
                return errResult(err);
            }
        },
    );
}
