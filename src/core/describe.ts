// 机器可读清单:把「能选什么」一次性摊平成结构化数据。
//
// 为什么需要:CLI 的 --help 只说「有哪些参数」,没说「每个选项是什么、依赖什么、装哪些包」。
// 模型(尤其 MCP 侧的模型)要挑原子/事件域/界面位/缝,必须一次拿到全量信息:
// 界面位配哪些原子、界面位落到哪个宿主包的哪个槽位键、事件域带哪些宿主包、缝要什么包。
// 这些散在 domain/* 的多个清单里,此前没有任何出口把它们拼起来 —— 于是它们被抄进了
// skill 的 reference 快照里(会随版本过期)。这里改成从源头现取。
//
// 纯数据 + 纯函数:label/desc 惰性求值(语言在调用时刻才定,不在模块加载期)。

import { ATOMS } from "../domain/atoms";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES, SURFACE_REQUIRES } from "../domain/uiSurfaces";
import { SEAMS } from "../domain/seams";
import { SCENARIOS } from "../domain/scenarios";
import { listScenarioCases } from "../generate/scenarioCase";
import { getTrackManifest, type TrackTarget } from "../domain/manifests";
import type { AtomId, ConfigMode, PkgPosition } from "../domain/types";

/** 机器可读清单的形状(给 MCP tool 返回值 / `dshp list --json` 用) */
export interface Catalog {
    /** 两轨的版本配套(双轨同版是合法瞬时态) */
    tracks: {
        target: TrackTarget;
        dshVersion: string;
        cordisPeer: string;
        schemasteryVersion: string;
        settingsSlot: string;
    }[];
    /** 预设组合(能力被锁死) */
    presets: {
        id: string;
        label: string;
        defaultDirName: string;
        atoms: AtomId[];
        eventDomains: string[];
        uiSurfaces: string[];
        serviceCreate: boolean;
        serviceSeams: string[];
        config: ConfigMode;
    }[];
    /** 精选案例(整目录拷贝;随轨不同,故按轨分列) */
    cases: { target: TrackTarget; id: string }[];
    /** 原子(可自由勾选) */
    atoms: { id: AtomId; label: string; desc: string; isDefault: boolean }[];
    /** 事件域 */
    eventDomains: {
        id: string;
        label: string;
        desc: string;
        pkgs: readonly string[];
        eventCount: number;
    }[];
    /** 界面位(含宿主包、槽位键、依赖原子) */
    uiSurfaces: {
        id: string;
        label: string;
        desc: string;
        pkg: string;
        slots: readonly string[];
        /** 必须同勾的原子(缺了就生成不出注册名) */
        requires: readonly AtomId[];
    }[];
    /** 能力缝 */
    seams: { id: string; label: string; desc: string; pkgs: readonly string[] }[];
    /** 配置方式 */
    configModes: ConfigMode[];
    /** 包定位 */
    pkgPositions: PkgPosition[];
}

/**
 * 拼出全量机器可读清单
 * @param targets - 要列出的轨(缺省两轨都列)
 * @returns 清单(纯数据,可直接 JSON 序列化)
 */
export function describeCatalog(targets?: readonly TrackTarget[]): Catalog {
    const tracks = targets ?? (["latest", "next"] as const);

    return {
        tracks: tracks.map((target) => {
            const m = getTrackManifest(target);
            return {
                target,
                dshVersion: m.version,
                cordisPeer: m.cordisPeer,
                schemasteryVersion: m.schemasteryVersion,
                settingsSlot: m.settingsSlot,
            };
        }),

        presets: SCENARIOS.map((s) => ({
            id: s.id,
            label: s.label(),
            defaultDirName: s.defaultDirName,
            atoms: s.capabilities.atoms,
            eventDomains: s.capabilities.eventDomains,
            uiSurfaces: s.capabilities.uiSurfaces,
            serviceCreate: s.capabilities.serviceCreate,
            serviceSeams: s.capabilities.serviceSeams,
            config: s.capabilities.config,
        })),

        cases: tracks.flatMap((target) =>
            listScenarioCases(getTrackManifest(target)).map((id) => ({ target, id })),
        ),

        atoms: ATOMS.map((a) => ({
            id: a.id,
            label: a.label(),
            desc: a.desc(),
            isDefault: "default" in a ? a.default === true : false,
        })),

        eventDomains: EVENT_DOMAINS.map((d) => ({
            id: d.id,
            label: d.label(),
            desc: d.desc(),
            pkgs: d.pkgs,
            eventCount: d.events.length,
        })),

        uiSurfaces: UI_SURFACES.map((s) => ({
            id: s.id,
            label: s.label(),
            desc: s.desc(),
            pkg: s.pkg,
            slots: s.slots,
            requires: SURFACE_REQUIRES[s.id],
        })),

        seams: SEAMS.map((s) => ({
            id: s.id,
            label: s.label(),
            desc: s.desc(),
            pkgs: s.pkgs,
        })),

        configModes: ["none", "static", "dynamic"],
        pkgPositions: ["bundle", "library"],
    };
}
