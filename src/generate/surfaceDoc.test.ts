// 界面位说明段守门:README 里告诉开发者「去改哪个文件」,那个文件必须真的存在。
// (文档指错文件 = 开发者打开就扑空,比没有文档更糟;组件接线表与实际落盘脱节也由这条逮住)
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFromSpec } from "../core/create";
import { setLang } from "../locales";

const tmpDirs: string[] = [];

afterEach(() => {
    for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
    tmpDirs.length = 0;
    setLang("zh");
});

/** 生成一个项目并返回目录 */
function gen(name: string, surfaces: string[], lang: "zh" | "en" = "zh"): string {
    setLang(lang);
    const base = mkdtempSync(join(tmpdir(), "dshp-sdoc-"));
    tmpDirs.push(base);
    createFromSpec(
        {
            mode: "free",
            dirName: name,
            atoms: ["ui", "tool"],
            uiSurfaces: surfaces,
            target: "next",
        },
        true,
        base,
    );
    return join(base, name);
}

/**
 * 从 README 里抠出组件文件路径。
 * 匹配路径本身而不是「组件文件:」那个词 —— 中英双版措辞不同,路径形态才稳定。
 */
function componentPaths(readme: string): string[] {
    return [...readme.matchAll(/`(src\/client\/surfaces\/[^`]+)`/g)].map((m) => m[1]);
}

describe("README 界面位说明段", () => {
    it("选了界面位就有说明段,且列出的组件文件都真实存在", () => {
        const dir = gen("demo", ["chat-node", "sidebar-actions", "tool-view"]);
        const readme = readFileSync(join(dir, "README.md"), "utf8");

        expect(readme).toContain("### 界面位说明");
        // 宿主槽位键要写出来(开发者据此查宿主文档)
        expect(readme).toContain("`conversation.chat.node`");
        expect(readme).toContain("`sidebar.panellist.actions`");
        expect(readme).toContain("`tool.call.toolview`");

        const paths = componentPaths(readme);
        expect(paths.length).toBe(3);
        for (const p of paths) {
            expect(existsSync(join(dir, p)), `README 指向的组件文件不存在:${p}`).toBe(true);
        }
    });

    it("英文版同样有说明段(路径与中文版一致)", () => {
        const zh = gen("zh-demo", ["chat-node"], "zh");
        const en = gen("en-demo", ["chat-node"], "en");
        const zhReadme = readFileSync(join(zh, "README.md"), "utf8");
        const enReadme = readFileSync(join(en, "README.md"), "utf8");

        expect(enReadme).toContain("### UI surfaces");
        expect(componentPaths(enReadme)).toEqual(componentPaths(zhReadme));
        for (const p of componentPaths(enReadme)) {
            expect(existsSync(join(en, p)), `英文版指向的组件文件不存在:${p}`).toBe(true);
        }
    });

    it("没选界面位就不出说明段(不留空标题)", () => {
        const dir = gen("plain", []);
        const readme = readFileSync(join(dir, "README.md"), "utf8");
        expect(readme).not.toContain("界面位说明");
        expect(readme).not.toContain("{{SURFACE_DOC}}");
    });

    it("选界面位时说明段的组件路径不重复目录层级", () => {
        const dir = gen("demo2", ["sidebar"]);
        const readme = readFileSync(join(dir, "README.md"), "utf8");
        const paths = componentPaths(readme);
        expect(paths.length).toBe(1);
        expect(paths[0]).toBe("src/client/surfaces/SidebarPanel.tsx");
    });
});
