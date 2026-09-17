// 【M3】精选案例(金样)拷贝:把 templates/scenarios/<案例> 整目录拷为目标项目,
// 并把项目身份从案例 id 重写为用户项目名。精选案例所见即所得——只重写身份,
// 不做任何配置改造(覆盖参数在 -s 模式下不适用)。
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { writeFile } from "../render/render";
import { templatesRoot } from "./project";
import { DEV_PATCH_NOTES } from "./patches";

// 拷贝时的排除项:产物目录与机器私有文件(defensive;入库的案例本身不应含这些)
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);
// dev.patch.yml 虽不入库,但拷贝时会由 CLI 现场生成(见 copyScenarioCase 末尾)
const SKIP_FILES = new Set(["dev.patch.yml"]);

/** 案例库根目录(templates/scenarios/) */
function casesRoot(): string {
    return join(templatesRoot(), "scenarios");
}

/** 列出可用案例 id(子目录名,字典序;点目录是会话产物等私有物,不是案例) */
export function listScenarioCases(): string[] {
    const root = casesRoot();
    if (!existsSync(root)) return [];
    return readdirSync(root)
        .filter((n) => !n.startsWith(".") && statSync(join(root, n)).isDirectory())
        .sort();
}

/**
 * 拷贝精选案例到目标目录并重写身份。
 * 重写规则:案例 id 在文件中的全部出现处替换为项目名——覆盖 package.json name、
 * cordis.patch.yml id、插件 name 导出、tsdown 配置里的 __ModuleLoader__ id 与 README 行文。
 * @returns 拷贝的文件清单(相对 targetDir,字典序)
 */
export function copyScenarioCase(caseId: string, targetDir: string, pkgName: string): string[] {
    const sourceDir = join(casesRoot(), caseId);
    if (!existsSync(sourceDir)) {
        throw new Error(`精选案例不存在:${caseId}(可用:${listScenarioCases().join(", ")})`);
    }

    cpSync(sourceDir, targetDir, {
        recursive: true,
        filter: (src) => {
            const base = src.split(/[\\/]/).pop() ?? "";
            return !SKIP_DIRS.has(base) && !SKIP_FILES.has(base);
        },
    });

    // 点文件素材落盘:`_` 前缀换 `.` 开头(npm 不打包点文件素材,约定同 create-vite)
    applyDotfileNames(targetDir);

    const files: string[] = [];
    // 词边界替换(非纯子串):语义名若以案例 id 作前缀(如 notebookService),
    // 后面跟字母时边界断言失败不被误换;身份字段(包名/patch id/日志前缀等独立词)照常替换。
    // 案例 id 仅含小写字母与连字符,作为正则模式无特殊字符风险。
    const caseIdPattern = new RegExp(`\\b${caseId}\\b`, "g");
    walk(targetDir, (file) => {
        files.push(relative(targetDir, file));
        if (pkgName !== caseId) {
            const text = readFileSync(file, "utf8");
            if (text.includes(caseId)) {
                writeFileSync(file, text.replaceAll(caseIdPattern, pkgName));
            }
        }
    });

    // dev.patch.yml 由 CLI 现场生成而非随案例入库(内含本机绝对路径,gitignore 约定不入库,
    // 但案例 README 的调试步骤引用它)。以案例自己的 cordis.patch.yml 为底——id 已随身份重写、
    // config 块原样保留——仅把 name 换成源码入口绝对路径(直载 .ts,Node ESM 不支持目录导入)。
    const distPatch = join(targetDir, "cordis.patch.yml");
    if (!existsSync(distPatch)) {
        throw new Error(`案例 ${caseId} 缺少 cordis.patch.yml,无法生成 dev.patch.yml`);
    }
    const body = readFileSync(distPatch, "utf8");
    const insertAt = body.indexOf("- insert:");
    if (insertAt < 0) {
        throw new Error(`案例 ${caseId} 的 cordis.patch.yml 缺少 "- insert:" 行,无法生成 dev.patch.yml`);
    }
    const entryFile = resolve(targetDir, "src/index.ts");
    const named = body
        .slice(insertAt)
        .replace(/^(\s*name: ')[^']*(')$/m, `$1${entryFile}$2`);
    writeFile(targetDir, "dev.patch.yml", [...DEV_PATCH_NOTES, named].join("\n") + "\n");
    files.push("dev.patch.yml");

    return files.sort();
}

function walk(dir: string, visit: (file: string) => void): void {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (SKIP_DIRS.has(entry)) continue;
        if (statSync(full).isDirectory()) {
            walk(full, visit);
        } else if (!SKIP_FILES.has(entry)) {
            visit(full);
        }
    }
}

/** 递归把 `_` 前缀的素材文件落成点文件(`_gitignore`→`.gitignore`);目标已存在时保留目标不动 */
function applyDotfileNames(dir: string): void {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            applyDotfileNames(full);
            continue;
        }
        if (!entry.startsWith("_")) continue;
        const dest = join(dir, "." + entry.slice(1));
        if (!existsSync(dest)) renameSync(full, dest);
    }
}
