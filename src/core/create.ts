// 统一生成入口:一份「生成规格」→ 解析 → 计划或落盘。
//
// 为什么要有这一层:CLI 有三条生成路径(预设 / 案例 / 自由组合),MCP 又要同样的三条。
// 两边各写一套必然漂移(能力校验在问卷里一套、在别处一套就是现成例子)。
// 这里把「规格 → 结果」拆成纯函数,CLI 与 MCP 都调它,规则只有一份。
//
// 三种模式:
// - preset:预设组合(能力被预设锁定)
// - case:精选案例(整目录拷贝,身份重写)
// - free:自由组合(能力类清单逐项选)
//
// 三段式(解析 / 计划 / 落盘)的原因:
// - 解析:校验全在这里(轨名、预设、案例、能力硬约束、目录已存在),不落任何盘
// - 计划:算出待写文件但不写(CLI --dry-run 与 MCP 的「先看清再写」共用)
// - 落盘:真写
// 写盘前先算计划能提前暴露「素材与生成器漂移」(占位符解析不了)这类问题,
// 不必等落盘一半才发现。

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Answers } from "../domain/types";
import { buildScenarioAnswers, findScenario } from "../domain/scenarios";
import { buildFreeAnswers } from "./capabilities";
import { resolveTrackTarget, type TrackManifest } from "../domain/manifests";
import { planProject, writeProject } from "../generate/project";
import {
    copyScenarioCase,
    listScenarioCases,
    planScenarioCase,
} from "../generate/scenarioCase";
import { DshpError } from "./errors";

/** 生成模式 */
export type CreateMode = "preset" | "case" | "free";

/** 生成规格(CLI 与 MCP 共用的入参形状;字段全可选,模式决定哪些必填) */
export interface CreateSpec {
    /** 目标目录名(缺省按模式推导:预设取预设默认名,案例取案例 id,自由组合取 my-plugin) */
    dirName?: string;
    /** 生成模式 */
    mode: CreateMode;
    /** preset 模式的预设 id */
    preset?: string;
    /** case 模式的案例 id */
    case?: string;
    /** free 模式:原子 */
    atoms?: string[];
    /** free 模式:事件域 */
    eventDomains?: string[];
    /** free 模式:界面位 */
    uiSurfaces?: string[];
    /** free 模式:能力缝 */
    serviceSeams?: string[];
    /** free 模式:新建自有服务 */
    newService?: boolean;
    /** 配置方式 */
    config?: string;
    /** 目标轨(缺省 latest) */
    target?: string;
    pkgName?: string;
    pluginId?: string;
    toolName?: string;
    description?: string;
    author?: string;
    pkgPosition?: string;
}

/** 解析后的规格(校验已过,可以安全计划/落盘) */
export interface ResolvedCreate {
    mode: CreateMode;
    /** 目标轨 manifest(版本单源) */
    manifest: TrackManifest;
    /** 目录名(相对 baseDir) */
    dirName: string;
    /** 目标目录绝对路径 */
    targetDir: string;
    /** preset / free 模式的完整问卷答案(case 模式没有问卷,故无此字段) */
    answers?: Answers;
    /** case 模式的案例 id */
    caseId?: string;
    /** 身份替换主词(case 模式;缺省回落目录名) */
    identity: string;
    /** 案例模式的元信息覆盖(描述/作者/包名) */
    caseMeta?: { description?: string; author?: string; pkgName?: string };
}

/** 生成结果(计划态与落盘态统一成一个对象,written 字段区分) */
export interface CreateResult {
    mode: CreateMode;
    /** 是否已落盘(false = 只算了计划) */
    written: boolean;
    /** 目录名(相对 baseDir) */
    dirName: string;
    /** 目标目录绝对路径 */
    targetDir: string;
    /** 将要生成 / 已生成的文件(相对目标目录) */
    files: string[];
    /** 生成后该跑的命令 */
    nextSteps: string[];
    /** preset / free 模式解析出的完整答案(case 模式无) */
    answers?: Answers;
}

/** 生成后的标准后续命令(与 CLI 提示同源,避免两处文案漂移) */
export function nextSteps(dirName: string): string[] {
    return [
        `cd ${dirName}`,
        "pnpm install",
        "pnpm typecheck",
        "pnpm build",
        "pnpm dsh web --patch ./dev.patch.yml",
    ];
}

/**
 * 解析生成规格(纯函数:校验全在这里,不落盘)
 * @param spec - 生成规格
 * @param baseDir - 目标目录的基准目录(缺省当前工作目录)
 * @returns 解析结果
 * @throws DshpError 规格非法(轨名/预设/案例不存在、能力校验不过、目录已存在)
 */
export function resolveCreate(
    spec: CreateSpec,
    baseDir: string = process.cwd(),
): ResolvedCreate {
    // 轨:缺省 latest;非法值报错(不静默回落)
    const manifest = resolveTrackTarget(spec.target);
    if (!manifest) {
        throw new DshpError("UNKNOWN_TARGET", {
            value: String(spec.target),
            targets: "latest, next",
        });
    }

    if (spec.mode === "case") {
        if (!spec.case) {
            throw new DshpError("SCENARIO_REQUIRES_TEMPLATE");
        }
        const cases = listScenarioCases(manifest);
        if (!cases.includes(spec.case)) {
            throw new DshpError("CASE_NOT_FOUND", {
                name: spec.case,
                cases: cases.join(", "),
            });
        }
        const dirName = spec.dirName || spec.case;
        const targetDir = resolve(baseDir, dirName);
        assertDirFree(dirName, targetDir);
        const identity = spec.pluginId || dirName;
        return {
            mode: "case",
            manifest,
            dirName,
            targetDir,
            caseId: spec.case,
            identity,
            caseMeta: {
                ...(spec.description ? { description: spec.description } : {}),
                ...(spec.author ? { author: spec.author } : {}),
                ...(spec.pkgName ? { pkgName: spec.pkgName } : {}),
            },
        };
    }

    const answers =
        spec.mode === "preset" ? presetAnswers(spec) : freeAnswers(spec);
    const dirName = spec.dirName || answers.dirName;
    // 目录名可能被覆盖(预设默认名 vs 传入名),答案里的 dirName 要同步
    answers.dirName = dirName;
    const targetDir = resolve(baseDir, dirName);
    assertDirFree(dirName, targetDir);

    return {
        mode: spec.mode,
        manifest,
        dirName,
        targetDir,
        answers,
        identity: answers.pluginId,
    };
}

/**
 * 生成计划:算出将落盘的文件,但**不写盘**
 * @param resolved - 解析结果
 * @returns 待落盘文件清单(相对目标目录,字典序)
 */
export function planCreate(resolved: ResolvedCreate): string[] {
    if (resolved.mode === "case") {
        return planScenarioCase(resolved.caseId!, resolved.manifest);
    }
    return planProject(resolved.answers!, resolved.targetDir, resolved.manifest).map(
        (f) => f.path,
    );
}

/**
 * 落盘生成
 * @param resolved - 解析结果
 * @returns 实际写入的文件相对路径清单
 */
export function writeCreate(resolved: ResolvedCreate): string[] {
    if (resolved.mode === "case") {
        return copyScenarioCase(
            resolved.caseId!,
            resolved.targetDir,
            resolved.identity,
            resolved.manifest,
            resolved.caseMeta,
        );
    }
    return writeProject(resolved.answers!, resolved.targetDir, resolved.manifest);
}

/**
 * 按规格生成(计划或落盘)—— 一步到位版
 * @param spec - 生成规格
 * @param write - true = 落盘;false = 只算计划(不写任何文件)
 * @param baseDir - 目标目录的基准目录(缺省当前工作目录)
 * @returns 生成结果
 * @throws DshpError 规格非法(见 resolveCreate)
 */
export function createFromSpec(
    spec: CreateSpec,
    write: boolean,
    baseDir: string = process.cwd(),
): CreateResult {
    const resolved = resolveCreate(spec, baseDir);
    const files = write ? writeCreate(resolved) : planCreate(resolved);
    return {
        mode: resolved.mode,
        written: write,
        dirName: resolved.dirName,
        targetDir: resolved.targetDir,
        files,
        nextSteps: nextSteps(resolved.dirName),
        ...(resolved.answers ? { answers: resolved.answers } : {}),
    };
}

/** 目录已存在 = 失败态(半覆盖比报错更糟) */
function assertDirFree(dirName: string, targetDir: string): void {
    if (dirName !== "." && existsSync(targetDir)) {
        throw new DshpError("DIR_EXISTS", { dir: targetDir });
    }
}

/** 预设模式 → Answers(硬约束由 buildScenarioAnswers 校验) */
function presetAnswers(spec: CreateSpec): Answers {
    const preset = spec.preset ? findScenario(spec.preset) : undefined;
    if (!preset) {
        throw new DshpError("UNKNOWN_SCENARIO", {
            name: String(spec.preset),
            ids: "tool, llm, ui, events, protocol",
        });
    }
    const built = buildScenarioAnswers(preset, {
        dirName: spec.dirName || preset.defaultDirName,
        pkgName: spec.pkgName,
        pluginId: spec.pluginId,
        description: spec.description,
        author: spec.author,
        pkgPosition: spec.pkgPosition,
        config: spec.config,
        toolName: spec.toolName,
    });
    if (!built.answers) {
        throw built.error ?? new DshpError("CHECK_FAILED");
    }
    return built.answers;
}

/** 自由组合模式 → Answers(校验在 resolveCapabilities/buildFreeAnswers) */
function freeAnswers(spec: CreateSpec): Answers {
    return buildFreeAnswers(
        {
            atoms: spec.atoms,
            eventDomains: spec.eventDomains,
            uiSurfaces: spec.uiSurfaces,
            serviceSeams: spec.serviceSeams,
            serviceCreate: spec.newService,
            config: spec.config,
            toolName: spec.toolName,
        },
        {
            dirName: spec.dirName || "my-plugin",
            pkgName: spec.pkgName,
            pluginId: spec.pluginId,
            description: spec.description,
            author: spec.author,
            pkgPosition: spec.pkgPosition,
        },
    );
}
