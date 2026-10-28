// next 轨版本注册(单源):配套 npm next 轨宿主,积极跟随(rc 线即跟)
// 值的出处:2026-10-28 对 dsh@0.2.1-rc.4 发布元包 dependencies 的直读 + dsh-fork tag diff
// (dsh-v0.2.1-rc.2 → dsh-v0.2.1-rc.4 的定向核查)
// - vendor 配套逐值未变:cordis 4.0.5 / schemastery 3.18.5 / loader 1.0.6 / hmr 1.0.20 /
//   timer 1.1.7 / include 1.0.10 ⇒ cordisPeer / schemasteryVersion 沿用原值即可
// - 模板零改动:我们引用的 34 个 @deepseek-ai 子包在新版全部存在;8 个界面位槽位键全健在
//   (settings.plugins.tab 仍在,settings.plugin.item 仍删);PreToolDecision 定义体逐字相同;
//   MessageSourceMap 的 merge-extensible 机制逐字相同(自有 kind 声明仍有效);
//   插件门禁规则(plugin-compatibility)零变化
// - 0.2.1-rc.3 / rc.4 的实质变化与插件契约无关:官方模型列表跟随 /models、导航入口定制
//   (新增三个 actions 槽位 + ui-entry-customization 新包)、analytics 埋点
import type { TrackManifest } from "./track";

export const NEXT_MANIFEST: TrackManifest = {
    target: "next",
    version: "0.2.1-rc.4",
    cordisPeer: "~4.0.5",
    schemasteryVersion: "~3.18.5",
    settingsSlot: "settings.plugins.tab",
};
