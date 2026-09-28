// latest 轨版本注册(单源):配套 npm latest 轨宿主,保守跟随
// 值的出处:2026-09-28 对 dsh@0.1.5-rc.3 元包 dependencies 的直读(cordis 4.0.2 等全精确钉)
import type { TrackManifest } from "./track";

export const LATEST_MANIFEST: TrackManifest = {
    target: "latest",
    version: "0.1.5-rc.3",
    cordisPeer: "4.0.2",
    schemasteryVersion: "3.18.2",
    settingsSlot: "settings.plugin.item",
};
