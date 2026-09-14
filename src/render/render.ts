// 【M2-a】渲染引擎:占位符替换 + 路径替换 + 文件复制
// 设计要点:
// - 变量统一 {{UPPER_SNAKE}} 风格;原样替换,不做宽度处理
// - 文件路径同样支持占位符(如 src/{{TOOL_NAME}}.ts)
// - 二进制扩展名白名单跳过替换(原样复制),防止破坏图片等资源
import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    cpSync,
    readdirSync,
    statSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

/** 渲染变量表:键为占位符名(不含花括号) */
export type Vars = Record<string, string>;

// 二进制扩展名:这些文件原样复制,不做占位符替换
const BINARY_EXTS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".zip",
    ".gz",
]);

/** 单个文件名中的占位符替换(路径级) */
export function renderPath(path: string, vars: Vars): string {
    return path.replace(/\{\{([A-Z0-9_]+)\}\}/g, (whole, key: string) => vars[key] ?? whole);
}

/** 单个字符串内容中的占位符替换 */
export function renderString(content: string, vars: Vars): string {
    return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (whole, key: string) => vars[key] ?? whole);
}

/** 判断文件是否需要做内容替换(非二进制才替换) */
function isTextFile(path: string): boolean {
    const dot = path.lastIndexOf(".");
    if (dot < 0) return true; // 无扩展名按文本处理(如 tsconfig、LICENSE)
    return !BINARY_EXTS.has(path.slice(dot).toLowerCase());
}

/**
 * 将模板目录渲染到目标目录:递归遍历 → 路径替换 → 内容替换 → 落盘
 * @param templateDir - 模板根目录
 * @param targetDir - 生成目标目录
 * @param vars - 占位符变量表
 * @returns 实际写入的文件相对路径列表(供生成报告展示)
 */
export function renderDir(templateDir: string, targetDir: string, vars: Vars): string[] {
    const written: string[] = [];
    walk(templateDir, targetDir, targetDir, vars, written);
    return written;
}

// 递归遍历:目录递归创建,文件逐个渲染(baseDir 用于计算相对路径展示)
function walk(
    curTpl: string,
    curTarget: string,
    baseDir: string,
    vars: Vars,
    written: string[],
): void {
    if (!existsSync(curTarget)) {
        mkdirSync(curTarget, { recursive: true });
    }
    for (const name of readdirSync(curTpl)) {
        const tplPath = join(curTpl, name);
        const outName = renderPath(name, vars); // 文件名也做占位符替换
        const outPath = join(curTarget, outName);

        if (statSync(tplPath).isDirectory()) {
            walk(tplPath, outPath, baseDir, vars, written);
            continue;
        }

        // 文件落盘:文本做替换,二进制原样复制
        if (isTextFile(outPath)) {
            const raw = readFileSync(tplPath, "utf8");
            writeFileSync(outPath, renderString(raw, vars));
        } else {
            cpSync(tplPath, outPath);
        }
        written.push(relative(baseDir, outPath));
    }
}

/**
 * 直接落盘一个动态生成的文件(内容由调用方拼好,不走模板)
 * @param targetDir - 生成目标目录
 * @param relPath - 相对路径(含文件名)
 * @param content - 文件内容
 */
export function writeFile(targetDir: string, relPath: string, content: string): void {
    const out = join(targetDir, relPath);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, content);
}
