// next 轨版本注册(单源):配套 npm next 轨宿主,积极跟随(rc 线即跟)
// 值的出处:2026-10-20 对 dsh@0.2.1-rc.2 发布元包 dependencies 的直读——0.2.1-rc.2 与 0.2.0-rc.2 的
// vendor 配套只差一个小版本(cordis ~4.0.5 / schemastery ~3.18.5 / loader ~1.0.6 / timer ~1.1.7 /
// include ~1.0.10),dsh-* 家族版本滚动;引用到的 31 个子包在新版全部存在,契约复核全通
import type { TrackManifest } from "./track";

export const NEXT_MANIFEST: TrackManifest = {
    target: "next",
    version: "0.2.1-rc.2",
    cordisPeer: "~4.0.5",
    schemasteryVersion: "~3.18.5",
    settingsSlot: "settings.plugins.tab",
};
