// MCP tool 的入参 schema:合法取值全部从领域清单派生,不手抄。
//
// 为什么不手抄:MCP 的入参校验是模型的第一道闸门,手抄的清单会随源码漂移
// (加一个界面位、改一个 id 就忘了同步),而模型拿到过期 id 只会反复重试或瞎猜。
// 从源头派生则永远同源:清单变了,schema 跟着变。
//
// 描述文案也来自领域清单(惰性求值,跟随 --lang),故模型在 tool schema 里
// 就能看到「这个 id 是什么、依赖什么」,不必先 list 再猜。
import { z } from "zod";
import { ATOMS } from "../domain/atoms";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES, SURFACE_REQUIRES } from "../domain/uiSurfaces";
import { SEAMS } from "../domain/seams";
import { SCENARIOS } from "../domain/scenarios";
import { TRACK_TARGETS } from "../domain/manifests";
import { listScenarioCases } from "../generate/scenarioCase";
import { getTrackManifest } from "../domain/manifests";
import type { ConfigMode, PkgPosition } from "../domain/types";

/**
 * 领域清单 id → zod enum(取值来自运行时数组,类型层只保证是字符串集合)。
 * 描述走 .describe():zod v4 的构造参数不吃 description,塞进去会编译不过。
 */
function idEnum(ids: readonly string[], description: string) {
    // 非空数组才有意义:领域清单恒非空,空数组会让 zod 在构造期就抛
    return z.enum(ids as [string, ...string[]]).describe(description);
}

/** 把领域条目压成「id(标签:说明)」的一行串,塞进 schema 描述里 */
function describeItems(
    items: readonly {
        id: string;
        label: () => string;
        desc?: () => string;
    }[],
): string {
    return items
        .map((i) => (i.desc ? `${i.id}(${i.label()}: ${i.desc()})` : `${i.id}(${i.label()})`))
        .join(" · ");
}

/** 原子 id(领域清单顺序) */
export const ATOM_IDS = ATOMS.map((a) => a.id) as string[];
/** 事件域 id */
export const EVENT_DOMAIN_IDS = EVENT_DOMAINS.map((d) => d.id) as string[];
/** 界面位 id */
export const UI_SURFACE_IDS = UI_SURFACES.map((s) => s.id) as string[];
/** 能力缝 id */
export const SEAM_IDS = SEAMS.map((s) => s.id) as string[];
/** 预设 id */
export const PRESET_IDS = SCENARIOS.map((s) => s.id) as string[];

/**
 * 精选案例 id(两轨并集)。
 * 案例集随轨不同(案例是整目录拷贝,两棵树各自一份),故此处给并集,
 * 「该案例在不在目标轨」由处理函数按轨校验(错误码 CASE_NOT_FOUND)。
 */
export const CASE_IDS: string[] = [
    ...new Set(
        TRACK_TARGETS.flatMap((target) =>
            listScenarioCases(getTrackManifest(target)),
        ),
    ),
];

/** 配置方式(取值域与领域层一致) */
export const CONFIG_MODES: ConfigMode[] = ["none", "static", "dynamic"];
/** 包定位 */
export const PKG_POSITIONS: PkgPosition[] = ["bundle", "library"];

/** dshp_create_plugin 的入参 schema */
export function createPluginInputShape() {
    return {
        mode: z
            .enum(["preset", "case", "free"])
            .describe(
                "preset=预设组合(能力被锁定);case=精选案例(整目录拷贝,能力随案例);free=自由组合(逐项选能力)",
            ),
        dirName: z
            .string()
            .min(1)
            .optional()
            .describe(
                "目标目录名(相对当前工作目录)。缺省:preset 取预设默认名,case 取案例 id,free 取 my-plugin",
            ),
        preset: idEnum(
            PRESET_IDS,
            `preset 模式必填。可选:${describeItems(SCENARIOS)}`,
        ).optional(),
        case: idEnum(
            CASE_IDS,
            `case 模式必填。可选:${CASE_IDS.join(", ")}`,
        ).optional(),
        atoms: z
            .array(idEnum(ATOM_IDS, describeItems(ATOMS)))
            .optional()
            .describe(
                `free 模式:要生成的能力原子。可选:${describeItems(ATOMS)}。界面位依赖的原子必须同勾`,
            ),
        eventDomains: z
            .array(idEnum(EVENT_DOMAIN_IDS, describeItems(EVENT_DOMAINS)))
            .optional()
            .describe(
                `free 模式:要订阅的事件域。可选:${describeItems(EVENT_DOMAINS)}`,
            ),
        uiSurfaces: z
            .array(idEnum(UI_SURFACE_IDS, describeItems(UI_SURFACES)))
            .optional()
            .describe(
                `free 模式:要挂的宿主界面位。可选:${describeItems(UI_SURFACES)}。` +
                    `依赖原子:${Object.entries(SURFACE_REQUIRES)
                        .filter(([, req]) => req.length > 0)
                        .map(([id, req]) => `${id} 需 ${req.join(",")}`)
                        .join(" · ")}`,
            ),
        serviceSeams: z
            .array(idEnum(SEAM_IDS, describeItems(SEAMS)))
            .optional()
            .describe(
                `free 模式:要扩展的能力缝。可选:${describeItems(SEAMS)}`,
            ),
        newService: z
            .boolean()
            .optional()
            .describe("free 模式:是否新建自有服务(仅在勾了 service 原子时有效)"),
        config: z
            .enum(CONFIG_MODES as [ConfigMode, ...ConfigMode[]])
            .describe(
                "配置方式:none=无配置;static=静态配置;dynamic=运行时可改(读宿主设置页)",
            )
            .optional(),
        target: z
            .enum(TRACK_TARGETS)
            .describe(
                "配套哪一代 dsh 宿主:latest(保守跟随) | next(积极跟随)。两轨的模板树与版本配套不同",
            )
            .optional(),
        pkgName: z.string().optional().describe("npm 包名(缺省由插件 id 推导)"),
        pluginId: z
            .string()
            .optional()
            .describe("插件 id(Cordis name 导出,注入用;缺省取目录名)"),
        toolName: z
            .string()
            .optional()
            .describe("工具名(勾了 tool 原子时有效;缺省 example_tool)"),
        description: z.string().optional().describe("插件描述"),
        author: z.string().optional().describe("作者"),
        pkgPosition: z
            .enum(PKG_POSITIONS as [PkgPosition, ...PkgPosition[]])
            .describe(
                "包定位:bundle=独立插件包(默认,带 cordis.patch.yml) | library=库形态",
            )
            .optional(),
        dryRun: z
            .boolean()
            .optional()
            .describe(
                "是否只算计划不落盘。默认 true:先看清将生成哪些文件,确认后再显式传 false 写盘",
            ),
        lang: z
            .enum(["zh", "en"])
            .optional()
            .describe(
                "生成物语言(README 与注释文案)。缺省用服务器语言(--lang 指定或环境探测)。" +
                    "宿主 spawn 子进程时通常不继承 LANG,中文环境下建议显式传 zh",
            ),
    };
}

/** dshp_list_scenarios 的入参 schema */
export function listScenariosInputShape() {
    return {
        scope: z
            .enum(["all", "presets", "cases", "capabilities"])
            .describe(
                "要列出哪部分:all=全部(默认) | presets=预设组合 | cases=精选案例 | capabilities=能力清单(原子/事件域/界面位/缝)",
            )
            .optional(),
        target: z
            .enum(TRACK_TARGETS)
            .describe("只看某一轨(案例集随轨不同)")
            .optional(),
    };
}

/** dshp_doctor 的入参 schema */
export function doctorInputShape() {
    return {
        target: z
            .enum(TRACK_TARGETS)
            .describe("只诊断某一轨(缺省诊断两轨)")
            .optional(),
    };
}
