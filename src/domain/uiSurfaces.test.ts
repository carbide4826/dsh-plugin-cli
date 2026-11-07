// 界面位清单守门:清单与轨的关系 / 槽键与素材配对 / 依赖与 external 的收集
//
// 为什么要有这层:槽位键是宿主契约 —— 宿主在某个版本才引入的键,老宿主没有它,
// 选到就注册不上(静默不渲染,生成物看着正常但界面上什么都没有)。
// 守门盯四件事:①清单与轨的关系没漂 ②tracks 分叉机制没被改坏 ③素材槽位键与清单一致
// ④依赖/external 收集齐。
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
    SURFACE_REQUIRES,
    UI_SURFACES,
    uiSurfacesFor,
    isSurfaceAvailableOn,
    surfaceExternalPkgs,
    type UISurfaceId,
} from "./uiSurfaces";
import { knownDshPackages, LATEST_MANIFEST, NEXT_MANIFEST } from "./manifests";
import { templatesRoot } from "../generate/project";
import { SURFACE_WIRING } from "../atoms";

/** 宿主 0.2.1-rc.4 起引入的三个「更多菜单」槽位 */
const MORE_MENU_SURFACES = [
    "sidebar-actions",
    "session-views-actions",
    "right-guide-actions",
] as const;

/** 界面位 → 素材文件绝对路径(素材名与 id 不同名,如 sidebar → sidebar-panel) */
function assetFile(target: "latest" | "next", id: string): string {
    const wiring = SURFACE_WIRING[id as UISurfaceId];
    return join(
        templatesRoot(target),
        "atoms",
        "ui",
        "src",
        "client",
        `${wiring.file}.ts`,
    );
}

describe("界面位清单与轨的关系", () => {
    it("两轨同钉一个宿主版本 ⇒ 两轨可选界面位集合相同", () => {
        expect(LATEST_MANIFEST.version).toBe(NEXT_MANIFEST.version);
        expect(uiSurfacesFor("latest").map((s) => s.id).sort()).toEqual(
            uiSurfacesFor("next").map((s) => s.id).sort(),
        );
    });

    it("每个界面位都声明了可用轨,tracks 非空且是合法轨名", () => {
        for (const s of UI_SURFACES) {
            expect(s.tracks.length, `${s.id} 没声明可用轨`).toBeGreaterThan(0);
            for (const track of s.tracks) {
                expect(["latest", "next"]).toContain(track);
            }
        }
    });

    it("tracks 决定可见性:不在该轨的界面位被挡下(分叉机制本身)", () => {
        // 用假想条目测机制本身:上游再引入新槽位键时,按轨标注仍能挡住「老宿主选到新槽位」
        const nextOnly = { tracks: ["next"] } as const;
        expect(isSurfaceAvailableOn(nextOnly, "next")).toBe(true);
        expect(isSurfaceAvailableOn(nextOnly, "latest")).toBe(false);
        const both = { tracks: ["latest", "next"] } as const;
        expect(isSurfaceAvailableOn(both, "latest")).toBe(true);
        expect(isSurfaceAvailableOn(both, "next")).toBe(true);
    });

    it("SURFACE_REQUIRES 覆盖全部界面位(新增界面位必须登记依赖)", () => {
        const ids = UI_SURFACES.map((s) => s.id).sort();
        expect(Object.keys(SURFACE_REQUIRES).sort()).toEqual(ids);
        for (const s of UI_SURFACES) {
            expect(SURFACE_REQUIRES[s.id].length, `${s.id} 没登记依赖原子`).toBeGreaterThan(0);
        }
    });
});

describe("素材槽位键与清单配对", () => {
    it.each(["latest", "next"] as const)("%s 树的九个界面位素材都在,槽位键与清单一致", (target) => {
        for (const s of UI_SURFACES) {
            const file = assetFile(target, s.id);
            expect(existsSync(file), `${target} 树缺素材 ${file}`).toBe(true);
            const text = readFileSync(file, "utf8");
            for (const slot of s.slots) {
                expect(text, `${file} 的槽位键与清单不符`).toContain(slot);
            }
        }
    });

    it("素材里 import 的槽型声明包就是该界面位的 owner 包", () => {
        for (const target of ["latest", "next"] as const) {
            for (const s of UI_SURFACES) {
                const file = assetFile(target, s.id);
                const text = readFileSync(file, "utf8");
                expect(text, `${file} 未 import owner 包的槽型声明`).toContain(
                    `${s.pkg}/client`,
                );
            }
        }
    });

    it("三个「更多菜单」界面位两棵树都有(两轨同版 ⇒ 两轨同素材)", () => {
        for (const target of ["latest", "next"] as const) {
            for (const id of MORE_MENU_SURFACES) {
                expect(existsSync(assetFile(target, id)), `${target} 树缺 ${id}`).toBe(true);
            }
        }
    });
});

describe("依赖与 external 收集", () => {
    it("external 集合是 extra 的子集,且都在已知子包清单里", () => {
        for (const s of UI_SURFACES) {
            const extra = "extraPkgs" in s ? s.extraPkgs : [];
            const external = "externalPkgs" in s ? s.externalPkgs : [];
            for (const pkg of external) {
                expect(extra, `${s.id} 的 external 包没进 extraPkgs:${pkg}`).toContain(pkg);
            }
            for (const pkg of [...extra, ...external]) {
                expect(knownDshPackages, `${pkg} 不在 knownDshPackages 里`).toContain(pkg);
            }
        }
    });

    it("external 按勾选的界面位收集(不勾就不 external)", () => {
        expect(surfaceExternalPkgs("next", [])).toEqual([]);
        const all = surfaceExternalPkgs("next", [...MORE_MENU_SURFACES]);
        expect(all).toContain("@deepseek-ai/dsh-client-ui-primitives");
    });

    it("knownDshPackages 含「更多菜单」界面位要的两个宿主包", () => {
        expect(knownDshPackages).toContain("@deepseek-ai/dsh-client-ui-primitives");
        expect(knownDshPackages).toContain("@deepseek-ai/dsh-client-ui-sidebar-right");
    });
});

describe("两轨 manifest 与界面位清单对得上", () => {
    it("每轨的界面位都在该轨可选清单里(轨名与 manifest 一致)", () => {
        for (const manifest of [LATEST_MANIFEST, NEXT_MANIFEST]) {
            const ids = uiSurfacesFor(manifest.target).map((s) => s.id);
            expect(ids.length, `${manifest.target} 轨界面位为空`).toBeGreaterThan(0);
        }
    });

    it("UISurfaceId 与清单条目一一对应(类型层 id 与数据层不漂)", () => {
        const ids: UISurfaceId[] = UI_SURFACES.map((s) => s.id as UISurfaceId);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
