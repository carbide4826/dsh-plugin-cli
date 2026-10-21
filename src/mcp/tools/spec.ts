// dshp_spec:一次访谈的清单 + 缺项判定。
//
// 为什么需要它:dshp_create_plugin 的入参是一张**平面表**,模型看着它只会照着填,
// 不会主动想到「还得问存储位置/命名/工具名/要不要配置」。这个 tool 给的是**流程**:
// 每一步问什么、能不能跳过、跳过用啥默认、现在还缺哪几步、够不够开跑。
//
// 用法:先空 spec 调一次拿清单与第一问;每问完一步把答案并进 spec 再调一次;
// spec.ready 为 true 时用 specToCreateArgs / dshp_create_plugin 生成。
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    specGaps,
    specOptions,
    specSteps,
    specToCliArgs,
    specToCreateArgs,
    type Spec,
} from "../../core/spec";
import { errResult, okResult } from "../result";

interface SpecArgs {
    /** 已收集到的规格(键与 dshp_create_plugin 入参同名);skipped 记用户跳过的步骤 id */
    spec?: Record<string, unknown>;
    /** 只看某条路线的步骤 */
    mode?: "preset" | "case" | "free";
}

export function registerSpec(server: McpServer): void {
    server.registerTool(
        "dshp_spec",
        {
            title: "Interview checklist and gap check",
            description:
                "一次生成访谈的清单与缺项判定:每一步问什么、能不能跳过(跳过用啥默认)、" +
                "选项从哪来(预设/案例/原子/事件域/界面位/缝/配置方式/轨),以及「现在还缺哪几步、够不够开跑」。" +
                "用法:先空 spec 调一次拿第一问,每问完一步把答案并进 spec 再调一次;" +
                "spec.ready 为 true 后用 dshp_create_plugin 生成(参数用 specToCliArgs 编译的同一份)。",
            inputSchema: {
                spec: z
                    .record(z.string(), z.unknown())
                    .optional()
                    .describe(
                        "已收集到的规格。键与 dshp_create_plugin 入参同名:mode(preset/case/free)、" +
                            "template(模板 id)、templateKind(preset|case)、atoms、eventDomains、uiSurfaces、" +
                            "serviceSeams、newService、toolName、config、dirName、pkgName、pluginId、" +
                            "description、author、pkgPosition、target、lang。" +
                            "用户选择跳过的步骤,把步骤 id 记进 skipped(如 skipped:[\"author\"])",
                    ),
                mode: z
                    .enum(["preset", "case", "free"])
                    .optional()
                    .describe("只看某条路线的步骤(缺省按规格里的 mode 判,没定则给全部)"),
            },
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        async (args: SpecArgs) => {
            try {
                const spec: Spec = { ...(args.spec ?? {}) };
                const gaps = specGaps(spec);

                // 步骤清单:带现取的选项
                const steps = specSteps()
                    .filter((s) => !args.mode || !s.modes || s.modes.includes(args.mode))
                    .map((s) => {
                        const pending = gaps.pending.some((p) => p.id === s.id);
                        return {
                            id: s.id,
                            specKey: s.specKey,
                            alsoFills: s.alsoFills,
                            ask: s.ask,
                            required: s.required,
                            skip: s.skip,
                            note: s.note,
                            state: pending ? "pending" : "answered",
                            options: s.options ? specOptions(s.options) : undefined,
                        };
                    });

                const next = gaps.next
                    ? {
                          id: gaps.next.id,
                          specKey: gaps.next.specKey,
                          ask: gaps.next.ask,
                          required: gaps.next.required,
                          skip: gaps.next.skip,
                          note: gaps.next.note,
                          options: gaps.next.options
                              ? specOptions(gaps.next.options)
                              : undefined,
                      }
                    : null;

                return okResult({
                    ok: true,
                    mode: spec.mode ?? null,
                    steps,
                    next,
                    pending: gaps.pending.map((s) => s.id),
                    requiredPending: gaps.requiredPending.map((s) => s.id),
                    ready: gaps.ready,
                    // 齐了就把最终参数给出来:CLI 形态与 create 工具形态各一份
                    cliArgs: gaps.ready ? specToCliArgs(spec) : null,
                    createArgs: gaps.ready ? specToCreateArgs(spec) : null,
                });
            } catch (err) {
                return errResult(err);
            }
        },
    );
}
