// 配置方式 + 关联规则
import * as p from "@clack/prompts";
import type { Answers } from "../domain/types";
import { unwrap } from "../utils/prompt";

/**
 * 收集配置方式(静态默认/动态/无)
 * @param uiSurfaces - 已选界面位;含 "settings-card" 时「无」被禁用(设置卡片必须配配置)
 * @returns 配置方式,Answers 的 config 字段
 */
export async function askConfig(
    uiSurfaces: readonly string[],
): Promise<Answers["config"]> {
    const hasSettingsCard = uiSurfaces.includes("settings-card"); // 硬约束判定:设置卡片必须有配置可展示

    const config = unwrap(
        await p.select({
            message: "配置方式?",
            initialValue: "static",
            options: [
                {
                    value: "static",
                    label: "静态",
                    hint: "配置写进 cordis.yml,加载时生效",
                },
                {
                    value: "dynamic",
                    label: "动态",
                    hint: "用户可运行时改,实时生效(典型:模型接入类,换 API key 不重启)",
                },
                {
                    value: "none",
                    label: "无",
                    hint: hasSettingsCard
                        ? "零配置(勾选了设置卡片,需至少静态配置,不可选)" // 禁用原因就地说明
                        : "零配置",
                    disabled: hasSettingsCard, // 勾了设置卡片:禁选「无」
                },
            ],
        }),
    ) as Answers["config"];

    return config;
}
