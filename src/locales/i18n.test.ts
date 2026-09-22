// i18n 守门:字典结构对齐(key 集合两语言一致)+ 专有名词不被换译 + 语言切换生效
import { describe, expect, it, afterEach } from "vitest";
import { zh } from "./zh";
import { en } from "./en";
import { t, setLang, detectLang } from "./index";
import { HARD_TERMS } from "./terms";
import { ATOMS } from "../domain/atoms";

// 展平嵌套字典为「点路径 key → 字符串值」
function flatten(node: unknown, prefix = ""): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") out[path] = v;
        else Object.assign(out, flatten(v, path));
    }
    return out;
}

afterEach(() => setLang("zh")); // 用例间复位,避免语言状态泄漏影响其他测试

describe("字典结构对齐", () => {
    it("zh 与 en 的 key 集合完全一致", () => {
        const zhKeys = Object.keys(flatten(zh)).sort();
        const enKeys = Object.keys(flatten(en)).sort();
        expect(enKeys).toEqual(zhKeys);
    });

    it("所有文案值非空", () => {
        for (const [k, v] of Object.entries(flatten(en))) {
            expect(v.length > 0, `en.${k} 为空`).toBe(true);
        }
    });
});

describe("专有名词不译", () => {
    it("硬术语只出现在两种语言中的一种 = 被换译(双向条件判定:某语言出现则另一语言必须也有)", () => {
        const zhAll = Object.values(flatten(zh)).join("\n");
        const enAll = Object.values(flatten(en)).join("\n");
        for (const term of HARD_TERMS) {
            const inZh = zhAll.includes(term);
            const inEn = enAll.includes(term);
            expect(inZh, `zh 有而 en 缺术语 ${term}(en 侧被翻走)`)
                .toBe(inEn);
        }
    });
});

describe("语言切换与插值", () => {
    it("setLang 切换后 t() 取对应语言", () => {
        setLang("zh");
        expect(t("cli.fileList")).toBe("文件清单");
        setLang("en");
        expect(t("cli.fileList")).toBe("Files");
    });

    it("占位符插值生效,缺参占位符原样保留", () => {
        setLang("zh");
        expect(t("cli.dirExists", { dir: "/tmp/x" })).toContain("/tmp/x");
        expect(t("cli.dirExists")).toContain("{dir}");
    });

    it("未知 key 原样返回 key 本身(便于发现漏配)", () => {
        expect(t("no.such.key")).toBe("no.such.key");
    });

    it("环境探测:DSHP_LANG 优先,中文 LANG → zh,其余 → en", () => {
        const { LANG, DSHP_LANG } = process.env;
        try {
            process.env.DSHP_LANG = "en";
            process.env.LANG = "zh_CN.UTF-8";
            expect(detectLang()).toBe("en");
            delete process.env.DSHP_LANG;
            expect(detectLang()).toBe("zh");
            process.env.LANG = "en_US.UTF-8";
            expect(detectLang()).toBe("en");
        } finally {
            process.env.LANG = LANG;
            process.env.DSHP_LANG = DSHP_LANG;
        }
    });
});

describe("domain 惰性 label 跟随语言", () => {
    it("ATOMS label 在两种语言下都取到对应文案", () => {
        setLang("zh");
        expect(ATOMS[0].label()).toBe("工具");
        setLang("en");
        expect(ATOMS[0].label()).toBe("Tool");
    });
});
