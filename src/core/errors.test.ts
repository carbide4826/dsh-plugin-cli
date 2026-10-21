// 错误码层守门:code 与 i18n 键必须一一对应,否则报错时会漏出裸 key。
// 契约(改动前先想清楚):
// - ERROR_CODES 是稳定接口,只增不改;改 code 名 = 破坏性变更
// - 每个 code 恰好一条 LOCALE_KEY 映射,且该键在 zh/en 两份字典里都存在
// - 文案可改,code 不动;code 不可增删(除非同时处理迁移)
import { describe, expect, it } from "vitest";
import { ERROR_CODES, LOCALE_KEY, DshpError, isDshpError } from "./errors";
import { t } from "../locales";

describe("错误码全集", () => {
    it("code 无重复", () => {
        expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    });

    it("LOCALE_KEY 覆盖全部 code 且无多余项", () => {
        expect(Object.keys(LOCALE_KEY).sort()).toEqual([...ERROR_CODES].sort());
    });

    it("每个 code 的 i18n 键在 zh/en 两份字典里都存在(不漏配)", () => {
        for (const code of ERROR_CODES) {
            const key = LOCALE_KEY[code];
            // t() 查不到时会回落成 key 字符串本身;zh 缺键时回落 en,故两种语言都要显式验
            for (const lang of ["zh", "en"] as const) {
                process.env.DSHP_LANG = lang;
                const rendered = t(key);
                expect(rendered, `${code} 在 ${lang} 下查不到文案(key=${key})`).not.toBe(
                    key,
                );
                expect(rendered.length, `${code} 在 ${lang} 下的文案为空`).toBeGreaterThan(0);
            }
        }
        delete process.env.DSHP_LANG;
    });

    it("文案里的占位符与 code 的 params 键对得上(漏传参数会露出 {x})", () => {
        // 每条文案声明的占位符集合 ⊆ 该 code 允许传的参数集合
        const allowed: Partial<Record<string, string[]>> = {
            UNKNOWN_DEP: ["pkg"],
            UNKNOWN_AGGREGATE: ["file"],
            TEMPLATE_MISSING: ["path"],
            CASE_MISSING: ["name", "cases"],
            PATCH_MISSING: ["name"],
            INSERT_MISSING: ["name"],
            PKG_POSITION_INVALID: ["values"],
            CONFIG_INVALID: ["values"],
            CONFIG_NONE_REQUIRES_SETTINGS_CARD: ["id"],
            UNRESOLVED_PLACEHOLDER: ["list"],
            UNKNOWN_TARGET: ["value", "targets"],
            CASE_NOT_FOUND: ["name", "cases"],
            UNKNOWN_SCENARIO: ["name", "ids"],
            DIR_EXISTS: ["dir"],
            CASE_FLAG_INAPPLICABLE: ["flags"],
            LANG_INVALID: ["values"],
            ATOM_UNKNOWN: ["name", "ids"],
            EVENT_DOMAIN_UNKNOWN: ["name", "ids"],
            UI_SURFACE_UNKNOWN: ["name", "ids"],
            SEAM_UNKNOWN: ["name", "ids"],
            SURFACE_REQUIRES_ATOM: ["surfaces", "atoms"],
            INTERNAL_ERROR: ["message"],
        };
        for (const code of ERROR_CODES) {
            const key = LOCALE_KEY[code];
            const placeholders = [...t(key).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
            if (placeholders.length === 0) continue;
            const ok = allowed[code];
            expect(ok, `${code} 的文案含占位符 ${placeholders.join(",")} 但未登记允许的参数`).toBeDefined();
            for (const ph of placeholders) {
                expect(ok, `${code} 的占位符 ${ph} 未登记`).toContain(ph);
            }
        }
    });
});

describe("DshpError", () => {
    it("带稳定 code 与与语言无关的 params", () => {
        const err = new DshpError("UNKNOWN_DEP", { pkg: "some-pkg" });
        expect(err.code).toBe("UNKNOWN_DEP");
        expect(err.params).toEqual({ pkg: "some-pkg" });
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe("DshpError");
    });

    it("message 不预渲染文案(语言在最后一刻才定)", () => {
        // 预渲染会把语言固化在抛错瞬间,多层调用链里容易出错语言
        const err = new DshpError("UNKNOWN_DEP", { pkg: "p" });
        expect(err.message).not.toContain("未知依赖包");
        expect(err.message).not.toContain("unknown dependency");
    });

    it("isDshpError 认得领域错误,拒绝普通异常", () => {
        expect(isDshpError(new DshpError("DIR_EXISTS"))).toBe(true);
        expect(isDshpError(new Error("boom"))).toBe(false);
        expect(isDshpError("boom")).toBe(false);
    });
});
