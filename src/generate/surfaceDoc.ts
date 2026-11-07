// 生成物 README 的「界面位说明」段:把选中的界面位翻译成开发者能直接上手的一节
// (宿主槽位 / 组件文件 / 下一步动作)。
// 数据源唯一:界面位清单在 src/domain/uiSurfaces.ts,组件接线在 src/atoms.ts 的 SURFACE_WIRING;
// 这里只做拼装,不再另抄一份描述(抄一份 = 第二个事实源,界面位一变就漏改)。
import { SURFACE_WIRING } from "../atoms";
import { UI_SURFACES, type UISurfaceId } from "../domain/uiSurfaces";
import { t } from "../locales";

/** 产物里界面位组件的落盘根目录(SURFACE_WIRING 的 component 值自带 surfaces/ 前缀) */
const SURFACE_DIR = "src/client";

/**
 * 生成 README 的界面位说明段。
 * @param surfaceIds - 本次选中的界面位 id
 * @returns Markdown 段(多行);没选界面位时返回空串
 */
export function surfaceDoc(surfaceIds: readonly string[]): string {
    const picked = UI_SURFACES.filter((s) => surfaceIds.includes(s.id));
    if (picked.length === 0) return "";

    const lines: string[] = [];
    lines.push(`### ${t("readme.surfaceDoc.title")}`);
    lines.push("");
    for (const s of picked) {
        const wiring = SURFACE_WIRING[s.id as UISurfaceId];
        // 槽位键逐个列出:界面位可能占多个槽位(目前是一个,但清单允许多个)
        const slots = s.slots.map((k) => `\`${k}\``).join(" · ");
        lines.push(`**${s.label()}** · ${slots}`);
        lines.push("");
        lines.push(`- ${s.desc()}`);
        lines.push(
            `- ${t("readme.surfaceDoc.component")}: \`${SURFACE_DIR}/${wiring.component}\``,
        );
        lines.push(`- ${t("readme.surfaceDoc.next")}`);
        lines.push("");
    }
    return lines.join("\n").trimEnd();
}
