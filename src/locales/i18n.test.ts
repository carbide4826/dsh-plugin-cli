// i18n 守门:字典结构对齐(key 集合两语言一致)+ 专有名词不被换译 + 语言切换生效
import { describe, expect, it, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

describe("调用点 key 存在性", () => {
    // 上一轮的坑:新文案误放进 errors.* 段,CLI 却按 cli.* 读 → 终端直接露出裸 key。
    // zh/en key 集合一致这条守门抓不到(两边都放错了段),必须扫调用点。
    it("源码里所有字面量 t(\"...\") 的 key 都能查到(不留裸 key)", () => {
        const srcDir = new URL("../", import.meta.url);
        const files: string[] = [];
        const walk = (dir: URL): void => {
            for (const e of readdirSync(dir, { withFileTypes: true })) {
                const p = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
                if (e.isDirectory()) walk(p);
                else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
                    files.push(fileURLToPath(p));
                }
            }
        };
        walk(srcDir);

        const zhKeys = new Set(Object.keys(flatten(zh)));
        const enKeys = new Set(Object.keys(flatten(en)));
        const used = new Set<string>();
        for (const file of files) {
            const text = readFileSync(file, "utf8");
            // 注释里的 t("...") 是举例,不是调用点 —— 先剥掉行注释与块注释
            const code = text
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/(^|[^:])\/\/.*$/gm, "$1");
            // 静态字面量调用:t("cli.foo") / t(`cli.foo`);模板拼接的键(如 t(`prompts.capabilities.${k}`))不在此列
            for (const m of code.matchAll(/\bt\(\s*["'`]([a-zA-Z0-9_.]+)["'`]/g)) {
                if (m[1]) used.add(m[1]);
            }
        }
        expect(used.size).toBeGreaterThan(0);
        for (const key of used) {
            expect(zhKeys.has(key), `${key} 在 zh 字典里不存在`).toBe(true);
            expect(enKeys.has(key), `${key} 在 en 字典里不存在`).toBe(true);
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
