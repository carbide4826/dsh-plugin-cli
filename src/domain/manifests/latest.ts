// latest 轨版本注册(单源):配套 npm latest 轨宿主,保守跟随
// 值的出处:2026-11-07 对 dsh@0.2.2-rc.1 发布元包的直读 + dsh-fork tag diff
// (dsh-v0.2.1-rc.2 → dsh-v0.2.2-rc.1 的定向核查)
// - vendor 配套跳主版本:cordis ~4.1.0 / schemastery ~3.19.0(照抄官方声明)
// - 元包依赖零删除(新增 4 包:official-bundles / liveshare / forge-bundle /
//   personalized-recommendations),我们引用的 30 个 dsh-* 子包在新版全部存在
// - 插件门禁规则(plugin-compatibility)零变化;MessageSourceMap 的 merge-extensible
//   机制健在(自有 kind 声明仍有效);PreToolDecision 四态同形
// - engines 字段是 0.2.2-rc.1 起官方才声明的(此前两版都没有)⇒ 生成物照抄 >=24.9.0
// 升版依据:官方 latest 与 next 已合并为同一版本 0.2.2-rc.1(0.2.1 线整线退役),
// 本轨不升则产物装不进当前官方 latest 宿主(门禁按 peer 精确校验会硬拒)⇒ 随之追平;
// 轨名仍是稳定容器,分叉只发生在内容(树)不在版本号
import type { TrackManifest } from "./track";

export const LATEST_MANIFEST: TrackManifest = {
    target: "latest",
    version: "0.2.2-rc.1",
    cordisPeer: "~4.1.0",
    schemasteryVersion: "~3.19.0",
    settingsSlot: "settings.plugins.tab",
    engines: ">=24.9.0",
};
