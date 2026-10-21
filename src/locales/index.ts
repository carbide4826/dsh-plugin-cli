// 轻量 i18n:字典查值 + 语言检测与覆盖(无第三方依赖;CLI 文案无复数/日期格式需求,不值得引 i18next)
import { zh } from "./zh";
import { en } from "./en";
import { LOCALE_KEY, type DshpError } from "../core/errors";

export type Lang = "zh" | "en";

// en 在类型层 satisfies zh 的结构:key 集合不一致直接编译报错(守门测试另做运行时兜底)
// 递归把所有叶子放宽成 string:zh 是 as const 的字面量类型,不放宽 en 就必须逐字相同
type Strings<T> = {
    [K in keyof T]: T[K] extends string ? string : Strings<T[K]>;
};
export type Dict = Strings<typeof zh>;

// 语言在首次取文案时才解析(模块加载时 --lang 尚未解析,不能在 import 期定格)
let current: Lang | undefined;

/** 环境探测:DSHP_LANG 优先,LANG 兜底;中文环境 → zh,其余 → en */
export function detectLang(): Lang {
    const raw = process.env.DSHP_LANG ?? process.env.LANG ?? "";
    return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function getLang(): Lang {
    current ??= detectLang();
    return current;
}

export function setLang(lang: Lang): void {
    current = lang;
}

function lookup(dict: unknown, key: string): string | undefined {
    let node: unknown = dict;
    for (const part of key.split(".")) {
        if (node === null || typeof node !== "object") return undefined;
        node = (node as Record<string, unknown>)[part];
    }
    return typeof node === "string" ? node : undefined;
}

/**
 * 取当前语言的文案;{name} 形式占位符由 params 填充
 * @param key - 点路径 key(如 "cli.dirExists")
 * @param params - 插值参数;缺参时占位符原样保留(便于发现漏传)
 */
export function t(
    key: string,
    params?: Record<string, string | number>,
): string {
    const raw =
        lookup(getLang() === "zh" ? zh : en, key) ?? lookup(zh, key) ?? key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, name) =>
        params[name] !== undefined ? String(params[name]) : `{${name}}`,
    );
}

/**
 * 把 DshpError 渲染成当前语言的人话(CLI 呈现层用)。
 * 领域层只抛 code + params,文案在这里按 code 查表渲染——语言选择在最后一刻生效。
 * @param err - 领域错误
 * @returns 本地化文案;code 未登记文案时回落成 code 本身(便于发现漏配)
 */
export function renderError(err: DshpError): string {
    return t(LOCALE_KEY[err.code], err.params);
}
