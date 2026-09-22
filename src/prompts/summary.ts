import * as p from "@clack/prompts";
import type { Answers } from "../domain/types";
import { t } from "../locales";
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
    const s = (k: string) => t(`prompts.summary.${k}`);
    const lines = [
        `${s("dir")}       ${answers.dirName}`,
        `${s("pkg")}       ${answers.pkgName}`,
        `${s("pluginId")}    ${answers.pluginId}`,
        `${s("tool")}     ${answers.toolName || s("toolNone")}`,
        `${s("description")}       ${answers.description || s("none")}`,
        `${s("author")}       ${answers.author || s("none")}`,
        `${s("position")}     ${answers.pkgPosition}`,
        `${s("atoms")}       ${answers.atoms.join(", ") || s("skeleton")}`,
    ];

    if (answers.atoms.includes("events")) {
        lines.push(`${s("events")}     ${answers.eventDomains.join(", ")}`);
    }
    if (answers.atoms.includes("ui")) {
        lines.push(`${s("ui")}    ${answers.uiSurfaces.join(", ")}`);
    }
    if (answers.atoms.includes("service")) {
        const service = [
            answers.serviceCreate ? s("newService") : null,
            answers.serviceSeams.join(", ") || null,
        ]
            .filter(Boolean)
            .join(" + ");
        lines.push(`${s("service")}       ${service || s("serviceUnselected")}`);
    }
    lines.push(`${s("config")}   ${answers.config}`);

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

    p.note(lines.join("\n"), s("title"));
}
