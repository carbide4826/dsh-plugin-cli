// next 轨版本注册(单源):配套 npm next 轨宿主,积极跟随(rc 线即跟)
// 值的出处:2026-09-30 对 dsh@0.2.0-rc.2 元包 dependencies 的直读——0.2.0-rc.2 与 0.1.7-rc.2 的
// vendor 配套逐值相同(cordis ~4.0.4/schemastery ~3.18.4/loader ~1.0.5/timer ~1.1.6/include ~1.0.9),
// 仅 dsh-* 家族版本滚动,故除 version 外与 latest 轨同值
import type { TrackManifest } from "./track";

export const NEXT_MANIFEST: TrackManifest = {
    target: "next",
    version: "0.2.0-rc.2",
    cordisPeer: "~4.0.4",
    schemasteryVersion: "~3.18.4",
    settingsSlot: "settings.plugins.tab",
};
