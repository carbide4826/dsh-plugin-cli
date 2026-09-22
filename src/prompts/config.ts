// 配置方式 + 关联规则
import * as p from "@clack/prompts";
import type { Answers } from "../domain/types";
import { unwrap } from "../utils/prompt";
import { t } from "../locales";

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
            message: t("prompts.config.message"),
            initialValue: "static",
            options: [
                {
                    value: "static",
                    label: t("prompts.config.staticLabel"),
                    hint: t("prompts.config.staticHint"),
                },
                {
                    value: "dynamic",
                    label: t("prompts.config.dynamicLabel"),
                    hint: t("prompts.config.dynamicHint"),
                },
                {
                    value: "none",
                    label: t("prompts.config.noneLabel"),
                    hint: hasSettingsCard
                        ? t("prompts.config.noneDisabledHint") // 禁用原因就地说明
                        : t("prompts.config.noneHint"),
                    disabled: hasSettingsCard, // 勾了设置卡片:禁选「无」
                },
            ],
        }),
    ) as Answers["config"];

    return config;
}
