// latest 轨版本注册(单源):配套 npm latest 轨宿主,保守跟随
// 值的出处:2026-10-07 对 dsh@0.2.0-rc.2 发布元包 dependencies 的直读(cordis ~4.0.4 /
// schemastery ~3.18.4,dsh-* 家族全精确钉 0.2.0-rc.2)——官方 npm latest tag 已滚到 0.2.0-rc.2,
// 本轨随之追平,与 next 轨同版;轨名仍是稳定容器,分叉只发生在内容(树)不在版本号
import type { TrackManifest } from "./track";

export const LATEST_MANIFEST: TrackManifest = {
    target: "latest",
    version: "0.2.0-rc.2",
    cordisPeer: "~4.0.4",
    schemasteryVersion: "~3.18.4",
    settingsSlot: "settings.plugins.tab",
};
