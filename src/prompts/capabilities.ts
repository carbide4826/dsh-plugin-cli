// 能力勾选 + 渐进披露
import * as p from "@clack/prompts";
import type { Answers, AtomId } from "../domain/types";

import { ATOMS } from "../domain/atoms";
import { SEAMS } from "../domain/seams";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES } from "../domain/uiSurfaces";
import { unwrap, link } from "../utils/prompt";

// 能力问卷结果(Answers 的能力片段)
export interface CapabilityResult {
    atoms: AtomId[]; // 勾选原子,空 = 纯骨架
    toolName: string; // 工具名(勾 Tool 时才有值)
    eventDomains: string[]; // 事件域
    uiSurfaces: string[]; // 界面位
    serviceCreate: boolean; // 新建服务
    serviceSeams: string[]; // 扩展的缝
}

/**
 * 从数据清单取「default: true」条目的 id 列表,作为首轮初始勾选
 * @param items - 带 default 可选字段的清单(atoms/事件域/界面位/缝)
 * @returns 默认勾选的 id 数组
 */
function defaultIds<T extends { id: string; default?: boolean }>(
    items: readonly T[],
): string[] {
    return items.filter((x) => x.default).map((x) => x.id);
}

/**
 * 能力问卷入口:首轮默认 = 最常见的 tool 插件;「逐项调整」回到能力勾选并保留旧值
 * @returns Answers 的能力片段
 */
export async function askCapabilities(): Promise<CapabilityResult> {
    // 状态初始化为默认(tool 插件黄金路径);调整轮保留旧值
    let atoms = defaultIds(ATOMS) as Answers["atoms"]; // 首轮预勾 ["tool"]
    let toolName = "example_tool"; // 工具名默认
    let eventDomains: string[] = []; // 未勾 events,保持空
    let uiSurfaces: string[] = []; // 未勾 ui,保持空
    let serviceCreate = false; // 未勾 service
    let serviceSeams: string[] = [];

    // 勾选流程:直线走完一轮(原子 → 条件追问),initialValues 全吃当前状态
    const askOnce = async () => {
        // 第一层:5 原子多选(空 = 纯骨架;首轮预勾 tool,调整轮保留旧值)
        atoms = unwrap(
            await p.multiselect({
                message: "勾选插件能力(全不勾 = 纯工程骨架,空格切换回车确认)",
                options: ATOMS.map((a) => ({
                    value: a.id,
                    label: a.label,
                    hint: a.desc,
                })),
                initialValues: atoms,
                required: false, // 允许空选:空 = 纯骨架(纯工程壳,可加载零功能)
            }),
        ) as Answers["atoms"];

        // 勾了 Tool → 追问工具名(旧值做预填)
        if (atoms.includes("tool")) {
            toolName = unwrap(
                await p.text({
                    message: "工具名 tool name",
                    placeholder: "example_tool",
                    initialValue: toolName,
                }),
            );
        } else {
            toolName = ""; // 取消勾选 Tool 时清空,避免残留
        }

        // 勾了 Events → 事件域多选
        if (atoms.includes("events")) {
            eventDomains = unwrap(
                await p.multiselect({
                    message: `事件域 Events(域内事件由模板生成;清单外见 ${link(
                        "https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md",
                        " events矩阵",
                    )},68 个事件)`,
                    options: EVENT_DOMAINS.map((d) => ({
                        value: d.id,
                        label: d.label,
                        hint: d.desc,
                    })),
                    initialValues: eventDomains,
                }),
            ) as string[];
        } else {
            eventDomains = [];
        }

        // 勾了 UI → 界面位多选
        if (atoms.includes("ui")) {
            uiSurfaces = unwrap(
                await p.multiselect({
                    message: `界面位 UI surfaces(Owner 包与槽位由模板处理;清单外槽位见 ${link(
                        "https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-slots",
                        " ui-slots 文档",
                    )},可自行声明子槽)`,
                    options: UI_SURFACES.map((s) => ({
                        value: s.id,
                        label: s.label,
                        hint: s.desc,
                    })),
                    initialValues: uiSurfaces,
                }),
            ) as string[];
        } else {
            uiSurfaces = [];
        }

        // 勾了服务 → 新建服务与扩展缝平铺多选(可混选)
        if (atoms.includes("service")) {
            let picks = unwrap(
                await p.multiselect({
                    message: `服务 Service:新建,或扩展常用能力缝 Seam(可多选,清单外见 ${link(
                        "https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md",
                        " capability-seams 全景",
                    )})`,
                    options: [
                        {
                            value: "__create__",
                            label: "新建服务 new service",
                            hint: "extends Service,其他插件可 inject",
                        },
                        ...SEAMS.map((s) => ({
                            value: s.id,
                            label: s.label,
                            hint: s.desc,
                        })),
                        {
                            value: "__more__",
                            label: "其他 others(由用户自行配置)",
                        },
                    ],
                    initialValues: [
                        ...(serviceCreate ? ["__create__"] : []),
                        ...serviceSeams,
                    ],
                }),
            ) as string[];

            // 清单外哨兵:链接已在 message 里,不再弹出文档块;"其他"不产生任何数据
            picks = picks.filter((v) => v !== "__more__"); // 哨兵不进数据

            serviceCreate = picks.includes("__create__"); // 哨兵值分流
            serviceSeams = picks.filter((v) => v !== "__create__");
        } else {
            serviceCreate = false; // 取消勾选时清空
            serviceSeams = [];
        }
    };

    // 首轮勾选
    await askOnce();

    // 预览 → 确认循环:调整回到 askOnce,保留旧值
    for (;;) {
        // 预览页:汇总当前勾选
        const lines = atoms.length
            ? [
                  `工具: ${atoms.includes("tool") ? toolName : "未勾选"}`,
                  `事件域: ${atoms.includes("events") ? eventDomains.join(", ") || "(未选)" : "未勾选"}`,
                  `UI 界面: ${atoms.includes("ui") ? uiSurfaces.join(", ") || "(未选)" : "未勾选"}`,
                  `服务: ${
                      [
                          serviceCreate ? "新建服务" : null,
                          serviceSeams.length ? serviceSeams.join(", ") : null,
                      ]
                          .filter(Boolean)
                          .join(" + ") || "未勾选"
                  }`,
                  `协议驱动: ${atoms.includes("protocol") ? "已勾选" : "未勾选"}`,
              ]
            : ["(纯工程骨架:不勾任何能力)"];

        // 勾了对应原子才追加该域的文档链接提示
        const tips: string[] = [];
        if (atoms.includes("events")) {
            tips.push(
                ` ${link("https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md", "events矩阵")}`,
            );
        }
        if (atoms.includes("ui")) {
            tips.push(
                ` ${link("https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-slots", "ui-slots 槽位体系")}`,
            );
        }
        if (atoms.includes("service")) {
            tips.push(
                ` ${link("https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md", "capability-seams 全景")}`,
            );
        }
        if (tips.length) {
            lines.push("\n官方文档参考:", ...tips);
        }
        p.note(lines.join("\n"), "能力预览");

        // 直接生成 or 逐项调整
        const next = unwrap(
            await p.select({
                message: "确认这份配置?",
                initialValue: "go",
                options: [
                    { value: "go", label: "直接生成", hint: "按当前勾选继续" },
                    {
                        value: "adjust",
                        label: "逐项调整",
                        hint: "回到能力勾选,保留已选值",
                    },
                ],
            }),
        );
        if (next === "go") {
            return {
                atoms,
                toolName,
                eventDomains,
                uiSurfaces,
                serviceCreate,
                serviceSeams,
            };
        }
        // adjust:重走勾选(状态在外层变量,自动保留)
        await askOnce();
    }
}
