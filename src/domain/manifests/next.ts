// next 轨版本注册(单源):配套 npm next 轨宿主,积极跟随(rc 线即跟)
// 值的出处:2026-11-07 对 dsh@0.2.2-rc.1 发布元包的直读 + dsh-fork tag diff
// (dsh-v0.2.1-rc.4 → dsh-v0.2.2-rc.1 的定向核查)
// - vendor 配套跳主版本:cordis ~4.1.0 / schemastery ~3.19.0 / loader ~1.1.0 /
//   timer ~1.2.0 / include ~1.1.0(照抄官方声明)
// - 元包依赖零删除(新增 4 包),我们引用的 30 个 @deepseek-ai 子包在新版全部存在
// - 插件门禁规则(plugin-compatibility)零变化;MessageSourceMap 的 merge-extensible
//   机制健在;PreToolDecision 四态同形(allow/deny/cancel/ask)
// - 槽位键零删除(68 → 71,新增 conversation.chat.user.before / settings.section.icon /
//   sidebar.session.row.trailing);三个「更多菜单」槽位健在,声明包不变
// - engines 字段是 0.2.2-rc.1 起官方才声明的 ⇒ 生成物照抄 >=24.9.0
// 官方 latest 与 next 现已合并为同一版本 0.2.2-rc.1 ⇒ 两轨同钉该版本
// (同版是合法瞬时态,轨名与两棵树都不动)
import type { TrackManifest } from "./track";

export const NEXT_MANIFEST: TrackManifest = {
    target: "next",
    version: "0.2.2-rc.1",
    cordisPeer: "~4.1.0",
    schemasteryVersion: "~3.19.0",
    settingsSlot: "settings.plugins.tab",
    engines: ">=24.9.0",
};
