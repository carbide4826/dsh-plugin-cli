// 【M1-01】类型定义:问卷答案结构(Answers)——全流程数据契约

// 包定位
export type PkgPosition = "bundle" | "library";

// 原子 id
export type AtomId = "tool" | "events" | "service" | "ui" | "protocol";

// 配置方式
export type ConfigMode = "none" | "static" | "dynamic";

export interface Answers {
    name: string; // 插件名
    namePascal: string; // PascalCase 派生
    nameCamel: string; // camelCase 派生
    description: string; // 描述
    author: string; // 作者
    pkgPosition: PkgPosition; // 包定位
    atoms: AtomId[]; // 勾选原子,空 = 纯骨架
    eventDomains: string[]; // 事件域
    uiSurfaces: string[]; // 界面位
    serviceCreate: boolean; // 新建服务
    serviceSeams: string[]; // 扩展的缝
    config: ConfigMode; // 配置方式
}
