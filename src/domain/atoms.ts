// 原子定义与推荐默认

import type { AtomId } from "./types";

export const ATOMS = [
    { id: "tool", label: "工具", desc: "给模型加可调用工具", default: true },
    { id: "events", label: "事件", desc: "拦截和响应：权限门、审计、事件流" },
    { id: "service", label: "服务", desc: "新建服务,或者扩展常用能力seam" },
    { id: "ui", label: "UI 界面", desc: "往web界面新增面板/卡片 调整视图层" },
    { id: "protocol", label: "协议驱动", desc: "把外部程序/协议桥接进DSH" },
] as const satisfies readonly {
    id: AtomId;
    label: string;
    desc: string;
    default?: true;
}[];
