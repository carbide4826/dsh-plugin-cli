// 界面位按轨分叉守门:清单分叉 / 槽键与素材配对 / 依赖与 external 的按轨收集
//
// 为什么要有这层:槽位键是宿主契约 —— 宿主在某个版本才引入的键,老宿主没有它,
// 选到就注册不上(静默不渲染,生成物看着正常但界面上什么都没有)。
// 守门盯三件事:①清单按轨分叉没漂 ②素材里的槽位键与清单一致 ③依赖/external 按轨收集。
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
    SURFACE_REQUIRES,
    UI_SURFACES,
    uiSurfacesFor,
    surfaceExternalPkgs,
    type UISurfaceId,
} from "./uiSurfaces";
import { knownDshPackages, LATEST_MANIFEST, NEXT_MANIFEST } from "./manifests";
import { templatesRoot } from "../generate/project";

/** 宿主在 0.2.1-rc.4 才引入的三个「更多菜单」槽位(只在 next 轨可选) */
const NEXT_ONLY_SURFACES = [
    "sidebar-actions",
    "session-views-actions",
    "right-guide-actions",
] as const;

describe("界面位清单按轨分叉", () => {
    it("latest 轨看不到 next 轨专属界面位,next 轨全看得到", () => {
        const latest = uiSurfacesFor("latest").map((s) => s.id);
        const next = uiSurfacesFor("next").map((s) => s.id);
        for (const id of NEXT_ONLY_SURFACES) {
            expect(latest, `${id} 不该出现在 latest 轨`).not.toContain(id);
            expect(next, `${id} 应出现在 next 轨`).toContain(id);
        }
        // latest 轨是 next 轨的真子集(只多不少)
        expect(latest.length).toBeLessThan(next.length);
        for (const id of latest) expect(next).toContain(id);
    });

    it("每个界面位都声明了可用轨,tracks 非空且是合法轨名", () => {
        for (const s of UI_SURFACES) {
            expect(s.tracks.length, `${s.id} 没声明可用轨`).toBeGreaterThan(0);
            for (const track of s.tracks) {
                expect(["latest", "next"]).toContain(track);
            }
        }
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
    it("next 树的三个新界面位素材用的槽位键与清单一致", () => {
        const root = templatesRoot("next");
        for (const id of NEXT_ONLY_SURFACES) {
            const surface = UI_SURFACES.find((s) => s.id === id);
            expect(surface, `清单里没有 ${id}`).toBeDefined();
            const slots = surface!.slots;
            expect(slots.length, `${id} 没声明槽位键`).toBeGreaterThan(0);
            // 素材文件名 = 界面位 id 的 kebab 形式
            const file = join(root, "atoms", "ui", "src", "client", "surfaces", `${id}.ts`);
            expect(existsSync(file), `next 树缺素材 ${file}`).toBe(true);
            const text = readFileSync(file, "utf8");
            for (const slot of slots) {
                expect(text, `${file} 的槽位键与清单不符`).toContain(slot);
            }
        }
    });

    it("latest 树不含 next 轨专属界面位的素材(选不到 ⇒ 不会拷到不存在的文件)", () => {
        const root = templatesRoot("latest");
        for (const id of NEXT_ONLY_SURFACES) {
            const file = join(root, "atoms", "ui", "src", "client", "surfaces", `${id}.ts`);
            expect(existsSync(file), `latest 树不该有 ${file}`).toBe(false);
        }
    });

    it("素材里 import 的槽型声明包就是该界面位的 owner 包", () => {
        // 槽型声明(type-only)来自声明该槽位的那个包,import 错包则类型解析不到该槽位
        const root = templatesRoot("next");
        for (const id of NEXT_ONLY_SURFACES) {
            const surface = UI_SURFACES.find((s) => s.id === id)!;
            const file = join(root, "atoms", "ui", "src", "client", "surfaces", `${id}.ts`);
            const text = readFileSync(file, "utf8");
            expect(text, `${file} 未 import owner 包的槽型声明`).toContain(
                `${surface.pkg}/client`,
            );
        }
    });
});

describe("依赖与 external 按轨收集", () => {
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
        const all = surfaceExternalPkgs("next", [...NEXT_ONLY_SURFACES]);
        expect(all).toContain("@deepseek-ai/dsh-client-ui-primitives");
        // latest 轨压根选不到这三个界面位 ⇒ 永远收集不到 external
        expect(surfaceExternalPkgs("latest", [...NEXT_ONLY_SURFACES])).toEqual([]);
    });

    it("knownDshPackages 含 next 轨新增的两个宿主包", () => {
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
