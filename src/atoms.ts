// 【M2-b】生成计划:把问卷答案翻译成 M2-c 落盘所需的文件清单与拼装行。
// 纯函数、无 IO——生成器只负责渲染占位符、按 copy 拷文件、按 aggregates 的行写聚合文件。
// 融合知识(勾选 → 文件 + 行)全部收拢在本模块;行形状要调只改这里,不动生成器。

import type { Answers } from "./domain/types";
import { ATOMS } from "./domain/atoms";
import { EVENT_DOMAINS, type EventDomainId } from "./domain/events";
import { SEAMS, type SeamId } from "./domain/seams";
import { UI_SURFACES, type UISurfaceId } from "./domain/uiSurfaces";

/** 一个模板文件的拷贝项:from 相对 templates/atoms/,to 相对生成项目根 */
export interface FileCopy {
    from: string;
    to: string;
}

/** 一组拼装行:import 行 + apply/client apply 体内的调用行 */
export interface LineBlock {
    imports: string[];
    calls: string[];
}

/** 一个聚合文件的裁剪结果(行由本模块给出,文件骨架由生成器渲染) */
export interface AggregatePlan extends LineBlock {
    /** 聚合文件在生成项目内的路径 */
    file: string;
}

export interface GenerationPlan {
    copy: FileCopy[];
    /** 顶层 src/index.ts 的拼装行 */
    index: {
        injects: string[];
        imports: string[];
        calls: string[];
    };
    /** 聚合文件(events.ts / seams/index.ts / client/index.ts)的裁剪结果 */
    aggregates: AggregatePlan[];
    /** README「代码结构」段的追加行(基础行由 base 模板自带) */
    readmeStructure: string[];
}

// ---- 各子模板的接线数据(文件、函数名;与 templates/atoms/ 保持同步) ----

/** 事件域 → 聚合文件里的 import/call 接线 */
const DOMAIN_WIRING: Record<EventDomainId, { file: string; fn: string }> = {
    tools: { file: "domains/tools", fn: "registerToolsListeners" },
    agent: { file: "domains/agent", fn: "registerAgentListeners" },
    session: { file: "domains/session", fn: "registerSessionListeners" },
    approval: { file: "domains/approval", fn: "registerApprovalListeners" },
    fs: { file: "domains/fs", fn: "registerFsListeners" },
    settings: { file: "domains/settings", fn: "registerSettingsListeners" },
};

/** 能力缝 → 接线 */
const SEAM_WIRING: Record<SeamId, { file: string; fn: string }> = {
    llm: { file: "seams/llm", fn: "registerLlmSeam" },
    systemPrompt: { file: "seams/systemPrompt", fn: "registerSystemPromptSeam" },
    subagents: { file: "seams/subagents", fn: "registerSubagentsSeam" },
    web: { file: "seams/web", fn: "registerWebSeam" },
    commands: { file: "seams/commands", fn: "registerCommandsSeam" },
    storage: { file: "seams/storage", fn: "registerStorageSeam" },
};

/** 界面位 → 接线(component = 随附组件模板文件) */
const SURFACE_WIRING: Record<UISurfaceId, { file: string; fn: string; component: string }> = {
    "settings-card": { file: "surfaces/settings-card", fn: "registerSettingsCard", component: "surfaces/SettingsCard.tsx" },
    "chat-node": { file: "surfaces/chat-node", fn: "registerChatNode", component: "surfaces/ChatNode.tsx" },
    "input-dock": { file: "surfaces/input-dock", fn: "registerInputDock", component: "surfaces/InputDock.tsx" },
    sidebar: { file: "surfaces/sidebar-panel", fn: "registerSidebarPanel", component: "surfaces/SidebarPanel.tsx" },
    "tool-view": { file: "surfaces/tool-view", fn: "registerToolView", component: "surfaces/ToolView.tsx" },
    "session-header": { file: "surfaces/session-header", fn: "registerSessionHeader", component: "surfaces/SessionHeader.tsx" },
};

/**
 * 由问卷答案计算完整生成计划
 * @param answers - 完整问卷答案
 * @returns 文件拷贝清单 + index/聚合文件拼装行 + README 结构段
 */
export function planGeneration(answers: Answers): GenerationPlan {
    const plan: GenerationPlan = {
        copy: [],
        index: { injects: [], imports: [], calls: [] },
        aggregates: [],
        readmeStructure: [],
    };
    // 追加一行 import + 一行调用的便捷闭包
    // 相对导入一律 .ts 后缀:dev 直载走 Node 原生类型剥离(要求 .ts),构建由 tsdown 原生解析
    const wire = (block: LineBlock, file: string, fn: string, call: string): void => {
        block.imports.push(`import { ${fn} } from "./${file}.ts"`);
        block.calls.push(call);
    };

    // 按规范原子顺序遍历,保证输出稳定(不随勾选顺序浮动)
    for (const atom of ATOMS) {
        if (!answers.atoms.includes(atom.id)) continue;

        switch (atom.id) {
            case "tool": {
                plan.copy.push({ from: "tool/src/tool.ts", to: "src/tool.ts" });
                plan.index.injects.push("tools");
                wire(plan.index, "tool", "registerTool", "registerTool(ctx)");
                plan.readmeStructure.push("src/tool.ts          工具实现(defineTool + schema)");
                break;
            }

            case "events": {
                // 聚合文件由生成器渲染;只拷被勾选域的实现文件
                const domains = EVENT_DOMAINS.filter((d) => answers.eventDomains.includes(d.id));
                const aggregate: AggregatePlan = { file: "src/events.ts", imports: [], calls: [] };
                for (const d of domains) {
                    const w = DOMAIN_WIRING[d.id];
                    plan.copy.push({ from: `events/src/${w.file}.ts`, to: `src/${w.file}.ts` });
                    wire(aggregate, w.file, w.fn, `${w.fn}(ctx) // 域:${d.label}`);
                }
                plan.aggregates.push(aggregate);
                wire(plan.index, "events", "registerEventListeners", "registerEventListeners(ctx)");
                plan.readmeStructure.push(
                    "src/events.ts        事件域聚合(按勾选接线)",
                    "src/domains/         各事件域监听(ctx.on)",
                );
                break;
            }

            case "service": {
                const seams = SEAMS.filter((s) => answers.serviceSeams.includes(s.id));
                if (answers.serviceCreate) {
                    plan.copy.push({ from: "service/src/service.ts", to: "src/service.ts" });
                    plan.index.imports.push(`import { ExampleService } from "./service.ts"`);
                    plan.index.calls.push("ctx.plugin(ExampleService) // 挂载自有服务");
                    plan.readmeStructure.push("src/service.ts       自有服务(extends Service)");
                }
                if (seams.length > 0) {
                    // 聚合入口放 src/seams/index.ts(与 client/index.ts 同构),避免 seams.ts 与 seams/ 同名并存
                    const aggregate: AggregatePlan = { file: "src/seams/index.ts", imports: [], calls: [] };
                    for (const s of seams) {
                        const w = SEAM_WIRING[s.id];
                        plan.copy.push({ from: `service/src/${w.file}.ts`, to: `src/${w.file}.ts` });
                        plan.index.injects.push(s.inject); // 缝要求的服务就绪,并入入口 inject 并集
                        // 聚合入口已在 seams/ 目录内,各缝相对导入不含目录前缀
                        wire(aggregate, w.file.replace(/^seams\//, ""), w.fn, `${w.fn}(ctx) // 缝:${s.label}`);
                    }
                    plan.aggregates.push(aggregate);
                    wire(plan.index, "seams/index", "registerServiceSeams", "registerServiceSeams(ctx)");
                    plan.readmeStructure.push(
                        "src/seams/index.ts   能力缝聚合(按勾选接线)",
                        "src/seams/           各能力缝注册实现",
                    );
                }
                break;
            }

            case "ui": {
                // host 侧零贡献;client 半边:聚合入口生成,按勾选拷实现与组件
                const surfaces = UI_SURFACES.filter((s) => answers.uiSurfaces.includes(s.id));
                const aggregate: AggregatePlan = { file: "src/client/index.ts", imports: [], calls: [] };
                // CSS Modules 的 TS 契约:.module.css 导入返回类名映射(组件样式文件的配套声明)
                plan.copy.push({ from: "ui/src/css-modules.d.ts", to: "src/css-modules.d.ts" });
                for (const s of surfaces) {
                    const w = SURFACE_WIRING[s.id];
                    plan.copy.push(
                        // 注册层不含 JSX,文件用 .ts(与导入后缀字面一致,直载安全);组件层保持 .tsx
                        { from: `ui/src/client/${w.file}.ts`, to: `src/client/${w.file}.ts` },
                        { from: `ui/src/client/${w.component}`, to: `src/client/${w.component}` },
                        // 组件样式与组件成对拷贝(构建期内联进 client.js,见 tsdown 配置的内联插件)
                        { from: `ui/src/client/${w.component.replace(/\.tsx$/, ".module.css")}`, to: `src/client/${w.component.replace(/\.tsx$/, ".module.css")}` },
                    );
                    wire(aggregate, w.file, w.fn, `${w.fn}(ctx) // 界面位:${s.label}`);
                }
                plan.aggregates.push(aggregate);
                plan.readmeStructure.push("src/client/          浏览器半边(client 聚合入口 + surfaces/ 界面位)");
                break;
            }

            case "protocol": {
                plan.copy.push({ from: "protocol/src/protocol.ts", to: "src/protocol.ts" });
                plan.index.injects.push("agents");
                wire(plan.index, "protocol", "registerProtocol", "registerProtocol(ctx)");
                plan.readmeStructure.push("src/protocol.ts      外部协议桥(webhook → agents)");
                break;
            }
        }
    }

    return plan;
}
