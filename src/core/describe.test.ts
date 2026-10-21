// 机器可读清单守门:形状完整 + 与领域清单同源(不各维护一份)
import { describe, expect, it } from "vitest";
import { describeCatalog } from "./describe";
import { ATOMS } from "../domain/atoms";
import { EVENT_DOMAINS } from "../domain/events";
import { UI_SURFACES, SURFACE_REQUIRES } from "../domain/uiSurfaces";
import { SEAMS } from "../domain/seams";
import { SCENARIOS } from "../domain/scenarios";
import { getTrackManifest } from "../domain/manifests";

describe("describeCatalog", () => {
    const c = describeCatalog();

    it("两轨的版本配套都列出来了(版本单源,清单不另抄一份)", () => {
        expect(c.tracks.map((t) => t.target)).toEqual(["latest", "next"]);
        for (const t of c.tracks) {
            const m = getTrackManifest(t.target);
            expect(t.dshVersion).toBe(m.version);
            expect(t.cordisPeer).toBe(m.cordisPeer);
            expect(t.schemasteryVersion).toBe(m.schemasteryVersion);
            expect(t.settingsSlot).toBe(m.settingsSlot);
        }
    });

    it("可选项集合与领域清单一一对应(清单加了新项,这里必须跟着长)", () => {
        expect(c.atoms.map((a) => a.id)).toEqual(ATOMS.map((a) => a.id));
        expect(c.eventDomains.map((d) => d.id)).toEqual(
            EVENT_DOMAINS.map((d) => d.id),
        );
        expect(c.uiSurfaces.map((s) => s.id)).toEqual(UI_SURFACES.map((s) => s.id));
        expect(c.seams.map((s) => s.id)).toEqual(SEAMS.map((s) => s.id));
        expect(c.presets.map((p) => p.id)).toEqual(SCENARIOS.map((s) => s.id));
    });

    it("界面位带宿主包、槽位键与依赖原子(模型据此选,选不出哑界面)", () => {
        for (const s of c.uiSurfaces) {
            expect(s.pkg).toMatch(/^@deepseek-ai\//);
            expect(s.slots.length).toBeGreaterThan(0);
            expect(s.requires).toEqual(
                SURFACE_REQUIRES[s.id as keyof typeof SURFACE_REQUIRES],
            );
        }
        // 依赖原子的界面位:依赖关系必须能被模型读到
        expect(c.uiSurfaces.find((s) => s.id === "tool-view")?.requires).toEqual([
            "tool",
        ]);
    });

    it("事件域带宿主包与事件数", () => {
        for (const d of c.eventDomains) {
            expect(d.pkgs.length).toBeGreaterThan(0);
            expect(d.eventCount).toBeGreaterThan(0);
        }
    });

    it("能力缝带宿主包", () => {
        for (const s of c.seams) {
            expect(s.pkgs.length).toBeGreaterThan(0);
        }
    });

    it("预设带锁定的能力组合与默认目录名", () => {
        for (const p of c.presets) {
            expect(p.defaultDirName.length).toBeGreaterThan(0);
            expect(p.config).toBeTruthy();
        }
    });

    it("按轨筛选取只列该轨的案例", () => {
        const only = describeCatalog(["next"]);
        expect(only.tracks.map((t) => t.target)).toEqual(["next"]);
        expect(only.cases.every((x) => x.target === "next")).toBe(true);
        expect(only.cases.length).toBeGreaterThan(0);
    });

    it("可 JSON 序列化(纯数据,无循环引用/函数)", () => {
        const round = JSON.parse(JSON.stringify(c));
        expect(round.atoms.length).toBe(c.atoms.length);
        expect(round.uiSurfaces.find((s: { id: string }) => s.id === "tool-view").requires).toEqual(["tool"]);
    });
});
