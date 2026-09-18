import * as p from "@clack/prompts";

/**
 * 把「值 | 取消符号」收敛成纯值,统一拦截 clack 的 Ctrl+C 取消
 * @param value - prompt 的原始返回值(正常值或取消符号)
 * @returns 正常值;用户取消时打印提示并直接退出进程
 */
export function unwrap<T>(value: T | symbol): T {
    if (p.isCancel(value)) {
        p.cancel("已取消"); // 用户主动取消,打印提示
        process.exit(0);
    }
    return value as T;
}

/**
 * 生成 OSC 8 终端超链接(支持的终端里原生可点击跳转;不支持的终端原样显示 URL)
 * @param url - 目标链接(https)
 * @param text - 展示文本;缺省直接显示 URL 本身
 * @returns 带转义序列的字符串
 */
export function link(url: string, text?: string): string {
    const label = text ?? url;
    return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}
