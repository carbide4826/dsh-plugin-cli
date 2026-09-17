// 【M1-10】依赖收集器:各原子/域/配置只"贡献",最后统一并集去重分桶
import type { Answers } from "./types";
import { EVENT_DOMAINS } from "./events";
import { UI_SURFACES } from "./uiSurfaces";
import { SEAMS } from "./seams";

// 依赖清单结果:对应 package.json 的三个区块
export interface DepBuckets {
    peer: string[]; // peerDependencies:运行时与宿主共享的核心服务包
    deps: string[]; // dependencies:插件自身运行时依赖
    dev: string[]; // devDependencies:构建与测试工具链
}

// ⚠️ dist-tag 陷阱:npm 上 @deepseek-ai/dsh-* 的 latest 标签是过期占位
// (dsh-tools latest = 0.0.1-rc.1),真实版本线在 next tag。
// dsh 各包一套整体发布、不独立兼容(fork 267 包与官方主包 dependencies 均为单版本线),
// 精确钉死(无 caret)是唯一诚实范围——caret 会装到本脚手架从未测试过的版本。
// 升版流程:改 SUPPORTED_DSH_VERSION → CLI 发版 → 生成物全部对齐(check 子命令二期自动校验)。
// 对齐脚本(自动从官方主包 dependencies 提取版本)已入计划,M1 不做。
export const SUPPORTED_DSH_VERSION = "0.1.5-rc.2"; // 所有 @deepseek-ai/dsh-* 统一钉死
export const SUPPORTED_CORDIS_VERSION = "^4.0.2"; // cordis 独立版本线,跟随官方主包声明

// 工程设施恒定项(不预装 vitest:模板不带测试,用户有需求自行添加)
const DEV_TOOLS = ["tsdown", "typescript"];
const DEV_TYPED_NODE = "@types/node";
// tsdown 的 CSS 管线(@tsdown/css 缺位时构建直接报错),仅 UI 项目需要
const DEV_TSDOWN_CSS = "@tsdown/css";

// 缝片段直接 import 的额外包(SEAMS.pkgs 之外;与 templates/atoms/service/src/seams/ 保持同步)
const SEAM_FRAGMENT_DEPS: Partial<Record<string, readonly string[]>> = {
    subagents: ["@deepseek-ai/dsh-agent", "@deepseek-ai/dsh-llm", "@deepseek-ai/dsh-session"],
};

/**
 * 按问卷答案收集全部依赖:Set 并集去重,按 peer/deps/dev 三桶输出
 * @param answers - 完整问卷答案
 * @returns 三条去重排序后的依赖清单
 */
export function collectDeps(answers: Answers): DepBuckets {
    // ① 贡献阶段:各来源只往里塞,不管重复
    const peer = new Set<string>(["@deepseek-ai/cordis"]); // Cordis 运行时恒定 peer
    const deps = new Set<string>();
    const dev = new Set<string>([...DEV_TOOLS, DEV_TYPED_NODE]);

    // ② Tool 原子:defineTool 的类型与 DSL 来源
    if (answers.atoms.includes("tool")) {
        peer.add("@deepseek-ai/dsh-tools");
    }

    // ②-b Protocol 原子:agents 注册面 + 协议桥骨架直接 import 的包(brand/llm/session)
    if (answers.atoms.includes("protocol")) {
        peer.add("@deepseek-ai/dsh-agent");
        peer.add("@deepseek-ai/dsh-brand");
        peer.add("@deepseek-ai/dsh-llm");
        peer.add("@deepseek-ai/dsh-session");
    }

    // ③ Events 域:勾选域的 pkgs 全给(定义包+实现包,用户不挑)
    for (const domainId of answers.eventDomains) {
        const domain = EVENT_DOMAINS.find((x) => x.id === domainId);
        if (domain) {
            for (const pkg of domain.pkgs) peer.add(pkg);
        }
    }

    // ④ UI 原子:slots/renderers 类型来源 + 各界面位 Owner 包进 peer;
    // react 系进 dev(官方 ui 插件声明在 devDependencies,运行时由 client 基线提供)
    if (answers.atoms.includes("ui")) {
        peer.add("@deepseek-ai/dsh-client-ui-slots");
        peer.add("@deepseek-ai/dsh-client-ui-renderer");
        for (const surfaceId of answers.uiSurfaces) {
            const surface = UI_SURFACES.find((x) => x.id === surfaceId);
            if (surface) peer.add(surface.pkg);
        }
        dev.add("react");
        dev.add("react-dom");
        dev.add("@types/react");
        dev.add(DEV_TSDOWN_CSS);
    }

    // ⑤ 服务:新建服务无额外包;扩展缝按缝的 pkgs 全给 + 片段直接 import 的额外包
    for (const seamId of answers.serviceSeams) {
        const seam = SEAMS.find((x) => x.id === seamId);
        if (seam) {
            for (const pkg of seam.pkgs) peer.add(pkg);
        }
        for (const pkg of SEAM_FRAGMENT_DEPS[seamId] ?? []) peer.add(pkg);
    }

    // ⑥ 配置方式:静态起装 schemastery;动态再加 settings 服务
    if (answers.config !== "none") {
        deps.add("@deepseek-ai/schemastery");
    }
    if (answers.config === "dynamic") {
        peer.add("@deepseek-ai/dsh-settings");
    }

    // ⑦ 去重收尾:Set → 排序数组(输出稳定,便于 diff 与测试断言)
    const sorted = (s: Set<string>) => [...s].sort();
    return { peer: sorted(peer), deps: sorted(deps), dev: sorted(dev) };
}
