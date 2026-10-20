// latest 轨版本注册(单源):配套 npm latest 轨宿主,保守跟随
// 值的出处:2026-10-20 对 dsh@0.2.1-rc.2 发布元包 dependencies 的直读(cordis ~4.0.5 /
// schemastery ~3.18.5,dsh-* 家族全精确钉 0.2.1-rc.2)——官方 npm latest tag 已滚到 0.2.1-rc.2
// (与 next 同版,next 线被收编),本轨随之追平;轨名仍是稳定容器,分叉只发生在内容(树)不在版本号
// 升版依据:registry 序列 delta=7(同一 0.2.x 版本线迭代 ≥3 拍)+ canary 双轨 job 绿
// (2026-10-19 那轮 pinned=0.2.0-rc.2 latest=0.2.1-rc.2,改写后 install/typecheck/build 全绿)
import type { TrackManifest } from "./track";

export const LATEST_MANIFEST: TrackManifest = {
    target: "latest",
    version: "0.2.1-rc.2",
    cordisPeer: "~4.0.5",
    schemasteryVersion: "~3.18.5",
    settingsSlot: "settings.plugins.tab",
};
