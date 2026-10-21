// 自由组合层守门:能力选择的解析与硬约束校验(与交互问卷共用同一套规则)
import { describe, expect, it } from "vitest";
import { buildFreeAnswers, parseIdList, resolveCapabilities } from "./capabilities";
import { DshpError } from "./errors";

/** 断言抛出的 DshpError 带指定 code */
function expectCode(fn: () => unknown, code: string): void {
    try {
        fn();
    } catch (err) {
        expect(err, `期望抛 DshpError(${code}),实际:${String(err)}`).toBeInstanceOf(DshpError);
        expect((err as DshpError).code).toBe(code);
        return;
    }
    throw new Error(`期望抛出 ${code},但没有抛错`);
}

describe("parseIdList", () => {
    it("逗号分隔 → 去空去重的 id 数组", () => {
        expect(parseIdList("tool, ui ,tool")).toEqual(["tool", "ui"]);
        expect(parseIdList("")).toEqual([]);
        expect(parseIdList(undefined)).toBeUndefined();
    });
});

describe("resolveCapabilities", () => {
    it("空选择 = 纯骨架(工具名清空,config 默认 none)", () => {
        const caps = resolveCapabilities({});
        expect(caps.atoms).toEqual([]);
        expect(caps.toolName).toBe("");
        expect(caps.config).toBe("none");
        expect(caps.serviceCreate).toBe(false);
    });

    it("勾 tool 原子才有工具名(缺省 example_tool)", () => {
        expect(resolveCapabilities({ atoms: ["tool"] }).toolName).toBe("example_tool");
        expect(
            resolveCapabilities({ atoms: ["tool"], toolName: "my_tool" }).toolName,
        ).toBe("my_tool");
    });

    it("未勾 tool 时工具名清空(不留残值)", () => {
        expect(
            resolveCapabilities({ atoms: ["ui"], toolName: "my_tool" }).toolName,
        ).toBe("");
    });

    it("未知 id 报对应错误码,并列出可用值", () => {
        expectCode(() => resolveCapabilities({ atoms: ["nope"] }), "ATOM_UNKNOWN");
        expectCode(
            () => resolveCapabilities({ eventDomains: ["nope"] }),
            "EVENT_DOMAIN_UNKNOWN",
        );
        expectCode(
            () => resolveCapabilities({ uiSurfaces: ["nope"] }),
            "UI_SURFACE_UNKNOWN",
        );
        expectCode(
            () => resolveCapabilities({ serviceSeams: ["nope"] }),
            "SEAM_UNKNOWN",
        );
    });

    it("界面位依赖的原子必须同勾(tool-view 需 tool)", () => {
        expectCode(
            () => resolveCapabilities({ atoms: ["ui"], uiSurfaces: ["tool-view"] }),
            "SURFACE_REQUIRES_ATOM",
        );
        // 补上 tool 即通过
        const caps = resolveCapabilities({
            atoms: ["tool", "ui"],
            uiSurfaces: ["tool-view"],
        });
        expect(caps.uiSurfaces).toEqual(["tool-view"]);
    });

    it("settings-card 界面位要求 config 非 none", () => {
        expectCode(
            () => resolveCapabilities({ atoms: ["ui"], uiSurfaces: ["settings-card"] }),
            "CONFIG_NONE_REQUIRES_SETTINGS_CARD",
        );
        expect(
            resolveCapabilities({
                atoms: ["ui"],
                uiSurfaces: ["settings-card"],
                config: "dynamic",
            }).config,
        ).toBe("dynamic");
    });

    it("非法 config 取值报 CONFIG_INVALID", () => {
        expectCode(
            () => resolveCapabilities({ config: "auto" }),
            "CONFIG_INVALID",
        );
    });
});

describe("buildFreeAnswers", () => {
    it("身份缺省由目录名推导;包名缺省跟随插件 id", () => {
        const answers = buildFreeAnswers({ atoms: ["tool"] }, { dirName: "my-plugin" });
        expect(answers.dirName).toBe("my-plugin");
        expect(answers.pluginId).toBe("my-plugin");
        expect(answers.pkgName).toBe("my-plugin");
        expect(answers.pkgPosition).toBe("bundle");
    });

    it("显式身份与元信息照单全收", () => {
        const answers = buildFreeAnswers(
            { atoms: ["tool"] },
            {
                dirName: "d",
                pkgName: "@scope/pkg",
                pluginId: "my-id",
                description: "desc",
                author: "me",
                pkgPosition: "library",
            },
        );
        expect(answers.pkgName).toBe("@scope/pkg");
        expect(answers.pluginId).toBe("my-id");
        expect(answers.description).toBe("desc");
        expect(answers.author).toBe("me");
        expect(answers.pkgPosition).toBe("library");
    });

    it("非法 pkgPosition 报 PKG_POSITION_INVALID", () => {
        expectCode(
            () => buildFreeAnswers({}, { dirName: "d", pkgPosition: "app" }),
            "PKG_POSITION_INVALID",
        );
    });
});
