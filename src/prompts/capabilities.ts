// 能力勾选 + 渐进披露
import * as p from "@clack/prompts";
import type { Answers, AtomId } from "../domain/types";

import { ATOMS } from "../domain/atoms";
import { SEAMS } from "../domain/seams";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES } from "../domain/uiSurfaces";
import { unwrap, link } from "../utils/prompt";
import { t } from "../locales";

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

    const EVENTS_DOC = "https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/event-producer-consumer.md";
    const UI_DOC = "https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-slots";
    const SEAMS_DOC = "https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md";

    // 勾选流程:直线走完一轮(原子 → 条件追问),initialValues 全吃当前状态
    const askOnce = async () => {
        // 第一层:5 原子多选(空 = 纯骨架;首轮预勾 tool,调整轮保留旧值)
        atoms = unwrap(
            await p.multiselect({
                message: t("prompts.capabilities.atomsMessage"),
                options: ATOMS.map((a) => ({
                    value: a.id,
                    label: a.label(),
                    hint: a.desc(),
                })),
                initialValues: atoms,
                required: false, // 允许空选:空 = 纯骨架(纯工程壳,可加载零功能)
            }),
        ) as Answers["atoms"];

        // 勾了 Tool → 追问工具名(旧值做预填)
        if (atoms.includes("tool")) {
            toolName = unwrap(
                await p.text({
                    message: t("prompts.capabilities.toolNameMessage"),
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
                    message: t("prompts.capabilities.eventsMessage", {
                        link: link(EVENTS_DOC, t("prompts.capabilities.eventsLink")),
                    }),
                    options: EVENT_DOMAINS.map((d) => ({
                        value: d.id,
                        label: d.label(),
                        hint: d.desc(),
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
                    message: t("prompts.capabilities.uiMessage", {
                        link: link(UI_DOC, t("prompts.capabilities.uiLink")),
                    }),
                    options: UI_SURFACES.map((s) => ({
                        value: s.id,
                        label: s.label(),
                        hint: s.desc(),
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
                    message: t("prompts.capabilities.serviceMessage", {
                        link: link(SEAMS_DOC, t("prompts.capabilities.serviceLink")),
                    }),
                    options: [
                        {
                            value: "__create__",
                            label: t("prompts.capabilities.serviceNew"),
                            hint: t("prompts.capabilities.serviceNewHint"),
                        },
                        ...SEAMS.map((s) => ({
                            value: s.id,
                            label: s.label(),
                            hint: s.desc(),
                        })),
                        {
                            value: "__more__",
                            label: t("prompts.capabilities.serviceMore"),
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
        const c = (k: string) => t(`prompts.capabilities.${k}`);
        // 预览页:汇总当前勾选
        const lines = atoms.length
            ? [
                  `${c("pvTool")}: ${atoms.includes("tool") ? toolName : c("pvUnchecked")}`,
                  `${c("pvEvents")}: ${atoms.includes("events") ? eventDomains.join(", ") || c("pvUnselected") : c("pvUnchecked")}`,
                  `${c("pvUi")}: ${atoms.includes("ui") ? uiSurfaces.join(", ") || c("pvUnselected") : c("pvUnchecked")}`,
                  `${c("pvService")}: ${
                      [
                          serviceCreate ? c("pvNewService") : null,
                          serviceSeams.length ? serviceSeams.join(", ") : null,
                      ]
                          .filter(Boolean)
                          .join(" + ") || c("pvUnchecked")
                  }`,
                  `${c("pvProtocol")}: ${atoms.includes("protocol") ? c("pvChecked") : c("pvUnchecked")}`,
              ]
            : [c("pvSkeleton")];

        // 勾了对应原子才追加该域的文档链接提示
        const tips: string[] = [];
        if (atoms.includes("events")) {
            tips.push(` ${link(EVENTS_DOC, c("eventsLink"))}`);
        }
        if (atoms.includes("ui")) {
            tips.push(` ${link(UI_DOC, c("uiLink"))}`);
        }
        if (atoms.includes("service")) {
            tips.push(` ${link(SEAMS_DOC, c("serviceLink"))}`);
        }
        if (tips.length) {
            lines.push(`\n${c("docsTitle")}`, ...tips);
        }
        p.note(lines.join("\n"), c("previewTitle"));

        // 直接生成 or 逐项调整
        const next = unwrap(
            await p.select({
                message: c("confirmMessage"),
                initialValue: "go",
                options: [
                    { value: "go", label: c("confirmGo"), hint: c("confirmGoHint") },
                    {
                        value: "adjust",
                        label: c("confirmAdjust"),
                        hint: c("confirmAdjustHint"),
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
