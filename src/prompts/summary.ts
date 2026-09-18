import * as p from "@clack/prompts";
import type { Answers } from "../domain/types";
import {
    collectDeps,
    SUPPORTED_DSH_VERSION,
    SUPPORTED_CORDIS_VERSION,
} from "../domain/deps";

/**
 * 打印问卷全景汇总:已填答案 + 依赖分桶清单(人工确认页)
 * @param answers - 完整问卷答案
 */
export function printSummary(answers: Answers): void {
    const lines = [
        `项目目录   ${answers.dirName}`,
        `npm 包名   ${answers.pkgName}`,
        `插件 id    ${answers.pluginId}`,
        `工具名     ${answers.toolName || "(未勾 Tool)"}`,
        `描述       ${answers.description || "(无)"}`,
        `作者       ${answers.author || "(无)"}`,
        `包定位     ${answers.pkgPosition}`,
        `能力       ${answers.atoms.join(", ") || "(纯骨架)"}`,
    ];

    if (answers.atoms.includes("events")) {
        lines.push(`事件域     ${answers.eventDomains.join(", ")}`);
    }
    if (answers.atoms.includes("ui")) {
        lines.push(`UI 界面    ${answers.uiSurfaces.join(", ")}`);
    }
    if (answers.atoms.includes("service")) {
        const service = [
            answers.serviceCreate ? "新建服务" : null,
            answers.serviceSeams.join(", ") || null,
        ]
            .filter(Boolean)
            .join(" + ");
        lines.push(`服务       ${service || "(未选)"}`);
    }
    lines.push(`配置方式   ${answers.config}`);

    // 依赖分桶:peer 带 DSH 版本范围,其余标来源
    const { peer, deps, dev } = collectDeps(answers);
    lines.push(
        "",
        `peerDependencies(@deepseek-ai/dsh-* ${SUPPORTED_DSH_VERSION};cordis ${SUPPORTED_CORDIS_VERSION}):`,
        ...peer.map(
            (x) =>
                `  ${x.startsWith("@deepseek-ai/cordis") ? `${x} ${SUPPORTED_CORDIS_VERSION}` : `${x} ${SUPPORTED_DSH_VERSION}`}`,
        ),
    );
    if (deps.length) {
        lines.push(`dependencies:`, ...deps.map((x) => `  ${x}`));
    }
    lines.push(`devDependencies:`, ...dev.map((x) => `  ${x}`));

    p.note(lines.join("\n"), "问卷汇总");
}
