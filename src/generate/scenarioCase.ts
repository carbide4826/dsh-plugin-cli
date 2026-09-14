// 【M3】精选案例(金样)拷贝:把 templates/scenarios/<案例> 整目录拷为目标项目,
// 并把项目身份从案例 id 重写为用户项目名。精选案例所见即所得——只重写身份,
// 不做任何配置改造(覆盖参数在 -s 模式下不适用)。
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { templatesRoot } from "./project";

// 拷贝时的排除项:产物目录与机器私有文件(defensive;入库的案例本身不应含这些)
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);
const SKIP_FILES = new Set(["dev.patch.yml"]);

/** 案例库根目录(templates/scenarios/) */
function casesRoot(): string {
    return join(templatesRoot(), "scenarios");
}

/** 列出可用案例 id(子目录名,字典序) */
export function listScenarioCases(): string[] {
    const root = casesRoot();
    if (!existsSync(root)) return [];
    return readdirSync(root)
        .filter((n) => statSync(join(root, n)).isDirectory())
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
    walk(targetDir, (file) => {
        files.push(relative(targetDir, file));
        if (pkgName !== caseId) {
            const text = readFileSync(file, "utf8");
            if (text.includes(caseId)) {
                writeFileSync(file, text.replaceAll(caseId, pkgName));
            }
        }
    });
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
