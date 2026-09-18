// 类型定义:问卷答案结构(Answers)——全流程数据契约

export type PkgPosition = "bundle" | "library";
export type AtomId = "tool" | "events" | "service" | "ui" | "protocol";
export type ConfigMode = "none" | "static" | "dynamic";

export interface Answers {
    dirName: string; // 项目目录
    pkgName: string; // npm 包名
    pluginId: string; // 插件 id(Cordis 的 name 导出,inject 用;patch 行 id 默认复用)
    toolName: string; // 工具名(defineTool 的 name;勾 Tool 时才问,未勾为空)
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
