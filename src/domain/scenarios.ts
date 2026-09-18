import type { Answers } from "./types";

export type ScenarioCapabilities = Pick<
    Answers,
    | "atoms"
    | "eventDomains"
    | "uiSurfaces"
    | "serviceCreate"
    | "serviceSeams"
    | "config"
    | "toolName"
>;

export interface ScenarioPreset {
    /** --template 的值,同时也是场景的唯一标识 */
    id: string;
    /** 场景显示名(help 与报错提示用) */
    label: string;
    /** 生成项目 package.json 的默认描述 */
    description: string;
    /** 未给 [name] 位置参数时的默认目录名 */
    defaultDirName: string;
    /** 锁定的能力组合 */
    capabilities: ScenarioCapabilities;
}

export const SCENARIOS: ScenarioPreset[] = [
    {
        id: "tool",
        label: "工具示例",
        description: "Example DSH plugin exposing a tool (scaffolded by dshp)",
        defaultDirName: "my-tool",
        capabilities: {
            atoms: ["tool"],
            eventDomains: [],
            uiSurfaces: [],
            serviceCreate: false,
            serviceSeams: [],
            config: "none",
            toolName: "example_tool",
        },
    },
    {
        id: "llm",
        label: "LLM 服务示例",
        description:
            "Example DSH plugin extending the llm seam via a service (scaffolded by dshp)",
        defaultDirName: "my-llm",
        capabilities: {
            atoms: ["service"],
            eventDomains: [],
            uiSurfaces: [],
            serviceCreate: true,
            serviceSeams: ["llm"],
            config: "none",
            toolName: "",
        },
    },
    {
        id: "ui",
        label: "界面示例",
        description:
            "Example DSH plugin with a settings-card UI surface (scaffolded by dshp)",
        defaultDirName: "my-ui",
        capabilities: {
            atoms: ["ui"],
            eventDomains: [],
            uiSurfaces: ["settings-card"],
            serviceCreate: false,
            serviceSeams: [],
            // 硬约束:设置卡片必须有配置可展示(与问卷 askConfig 的规则一致),最低给静态
            config: "static",
            toolName: "",
        },
    },
    {
        id: "events",
        label: "事件监听示例",
        description:
            "Example DSH plugin listening to session events (scaffolded by dshp)",
        defaultDirName: "my-events",
        capabilities: {
            atoms: ["events"],
            eventDomains: ["session"],
            uiSurfaces: [],
            serviceCreate: false,
            serviceSeams: [],
            config: "none",
            toolName: "",
        },
    },
    {
        id: "protocol",
        label: "HTTP 协议示例",
        description:
            "Example DSH plugin exposing an HTTP protocol endpoint (scaffolded by dshp)",
        defaultDirName: "my-protocol",
        capabilities: {
            atoms: ["protocol"],
            eventDomains: [],
            uiSurfaces: [],
            serviceCreate: false,
            serviceSeams: [],
            config: "none",
            toolName: "",
        },
    },
];

/** 按 id 查场景预设;未命中返回 undefined(调用方负责报错提示) */
export function findScenario(id: string): ScenarioPreset | undefined {
    return SCENARIOS.find((s) => s.id === id);
}

/** 场景生成时可被命令行参数覆盖的字段(未提供的字段回落场景预设或推导值) */
export interface ScenarioOverrides {
    /** 项目目录(位置参数,必有) */
    dirName: string;
    pkgName?: string;
    pluginId?: string;
    description?: string;
    author?: string;
    pkgPosition?: string; // bundle | library
    config?: string; // none | static | dynamic
    toolName?: string;
}

const PKG_POSITIONS = ["bundle", "library"] as const;
const CONFIG_MODES = ["none", "static", "dynamic"] as const;

/**
 * 场景预设 + 命令行覆盖合并为完整 Answers(纯函数,含取值与硬约束校验)。
 * 覆盖规则:参数传了用传的,没传回落场景预设;包名/插件 id 缺省由目录名推导。
 * @returns error 非空表示参数非法或违反硬约束(调用方负责报错退出)
 */
export function buildScenarioAnswers(
    preset: ScenarioPreset,
    o: ScenarioOverrides,
):
    | { answers: Answers; error?: undefined }
    | { answers?: undefined; error: string } {
    if (
        o.pkgPosition &&
        !(PKG_POSITIONS as readonly string[]).includes(o.pkgPosition)
    ) {
        return { error: `--pkg-position 仅支持:${PKG_POSITIONS.join(" | ")}` };
    }
    if (o.config && !(CONFIG_MODES as readonly string[]).includes(o.config)) {
        return { error: `--config 仅支持:${CONFIG_MODES.join(" | ")}` };
    }
    if (
        o.config === "none" &&
        preset.capabilities.uiSurfaces.includes("settings-card")
    ) {
        return {
            error: `场景 ${preset.id} 含 settings-card,--config none 不可用(设置卡片必须有配置可展示)`,
        };
    }

    const capabilities = { ...preset.capabilities };
    if (o.config) capabilities.config = o.config as Answers["config"];
    if (o.toolName) capabilities.toolName = o.toolName;

    return {
        answers: {
            dirName: o.dirName,
            pkgName: o.pkgName || o.dirName,
            pluginId: o.pluginId || o.dirName,
            description: o.description ?? preset.description,
            author: o.author ?? "",
            pkgPosition: (o.pkgPosition as Answers["pkgPosition"]) ?? "bundle",
            ...capabilities,
        },
    };
}
