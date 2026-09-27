// next 轨版本注册(单源):配套 npm next 轨宿主,积极跟随(rc 线即跟)
// 值的出处:2026-09-28 对 dsh@0.1.7-rc.2 元包 dependencies 的直读——0.1.7 起官方对 cordis
// 家族改 tilde 钉线(~4.0.4),我们照抄同款 specifier 保证两边共解析、安装树单实例
import type { TrackManifest } from "./track";

export const NEXT_MANIFEST: TrackManifest = {
    target: "next",
    version: "0.1.7-rc.2",
    cordisPeer: "~4.0.4",
    schemasteryVersion: "~3.18.4",
    settingsSlot: "settings.plugins.tab",
};
