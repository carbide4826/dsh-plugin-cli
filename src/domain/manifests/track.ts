// 目标版本轴类型与解析:latest / next 是稳定容器名,永不随版本改名(晋升只换内容)
export type TrackTarget = "latest" | "next";

export const TRACK_TARGETS = ["latest", "next"] as const;

/** 每轨持有的全部配套参数:树与 manifest 严格配对,生成时零解析、零回落 */
export interface TrackManifest {
    readonly target: TrackTarget;
    /** dsh 元包钉版:所有 @deepseek-ai/dsh-* 依赖与文档安装命令统一取此值 */
    readonly version: string;
    /** cordis specifier:照抄官方元包声明(精确或 tilde),发布 peer 与安装树同源——
     *  浮动 range 与官方声明不一致时会在安装树里造出第二实例,声明合并劈叉致 typecheck 红 */
    readonly cordisPeer: string;
    /** schemastery specifier:同 cordis 逻辑 */
    readonly schemasteryVersion: string;
    /** settings-card 界面位槽位键(2026-09-30 晋升后两轨同形=Plugins 页签槽;守门测试对照素材用) */
    readonly settingsSlot: string;
}
