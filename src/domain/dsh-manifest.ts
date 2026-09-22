// dsh 宿主版本清单:版本事实的唯一权威(升级时只改这里,规则见 docs/UPSTREAM-VERSION-POLICY.md)
// knownPackages 是「本版本我们引用的 @deepseek-ai/dsh-* 子包全景」,由各域清单求并构造——
// 升版 diff 报告以此为准:新版哪些子包被删/改名,对照这张表一目了然
import { EVENT_DOMAINS } from "./events";
import { SEAMS } from "./seams";
import { UI_SURFACES } from "./uiSurfaces";

export const DSH_MANIFEST = {
    /** 钉住的 DSH 版本:所有 @deepseek-ai/dsh-* 依赖与文档安装命令统一取此值 */
    version: "0.1.5-rc.2",
} as const;

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

/** 本版本引用的全部 @deepseek-ai/dsh-* 子包(排序输出,便于 diff) */
export const knownDshPackages: readonly string[] = [...declared]
    .filter((p) => p.startsWith(DSH_PKG_PREFIX))
    .sort();
