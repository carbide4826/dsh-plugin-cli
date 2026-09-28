// manifest 聚合出口:轨解析 + knownDshPackages 派生(升版 diff 报告的对照全景)
import { EVENT_DOMAINS } from "../events";
import { SEAMS } from "../seams";
import { UI_SURFACES } from "../uiSurfaces";
import { TRACK_TARGETS, type TrackManifest, type TrackTarget } from "./track";
import { LATEST_MANIFEST } from "./latest";
import { NEXT_MANIFEST } from "./next";

export { TRACK_TARGETS };
export type { TrackManifest, TrackTarget };
export { LATEST_MANIFEST, NEXT_MANIFEST };

const MANIFESTS: Record<TrackTarget, TrackManifest> = {
    latest: LATEST_MANIFEST,
    next: NEXT_MANIFEST,
};

/** 按轨取 manifest(轨名由 CLI 选项解析而来,必须合法) */
export function getTrackManifest(target: TrackTarget): TrackManifest {
    return MANIFESTS[target];
}

/** 解析 --target 原始输入:缺省回落 latest;非法值返回 undefined(调用方报错) */
export function resolveTrackTarget(raw: string | undefined): TrackManifest | undefined {
    if (raw === undefined) return MANIFESTS.latest;
    return (TRACK_TARGETS as readonly string[]).includes(raw)
        ? MANIFESTS[raw as TrackTarget]
        : undefined;
}

// 原子/缝/域各清单里声明的子包并集(tool/protocol 原子的内联贡献也在其中,见 collectDeps)
const DSH_PKG_PREFIX = "@deepseek-ai/dsh-";
const declared = new Set<string>([
    ...EVENT_DOMAINS.flatMap((d) => d.pkgs),
    ...SEAMS.flatMap((s) => s.pkgs),
    ...UI_SURFACES.map((s) => s.pkg),
    // tool / protocol 原子在 collectDeps 里的内联贡献(与 deps.ts 保持同步)
    "@deepseek-ai/dsh-tools",
    "@deepseek-ai/dsh-agent",
    "@deepseek-ai/dsh-brand",
    "@deepseek-ai/dsh-llm",
    "@deepseek-ai/dsh-session",
    // ui 原子的公共 peer(collectDeps 内联)
    "@deepseek-ai/dsh-client-ui-slots",
    "@deepseek-ai/dsh-client-ui-renderer",
    // 动态配置注入的 settings 服务(collectDeps 内联)
    "@deepseek-ai/dsh-settings",
]);

/** 我们引用的全部 @deepseek-ai/dsh-* 子包(排序输出,便于 diff;两轨引用面相同) */
export const knownDshPackages: readonly string[] = [...declared]
    .filter((p) => p.startsWith(DSH_PKG_PREFIX))
    .sort();
