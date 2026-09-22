// 精选案例(金样)拷贝:把 templates/scenarios/<案例> 整目录拷为目标项目,
import {
    cpSync,
    existsSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { writeFile } from "../render/render";
import { templatesRoot } from "./project";
import { DEV_PATCH_NOTES } from "./patches";
import { t, getLang } from "../locales";

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
        .filter(
            (n) => !n.startsWith(".") && statSync(join(root, n)).isDirectory(),
        )
        .sort();
}

/**
 * 拷贝精选案例到目标目录并重写身份。
 * 重写规则:案例 id 在文件中的全部出现处(词边界)替换为 identity(=插件 id)——覆盖插件 name 导出、
 * cordis.patch.yml id、tsdown 配置里的 __ModuleLoader__ id 与 README 行文;包名不参与替换,
 * 由 meta.pkgName 结构化写入 package.json(身份与包名解耦,单值替换不再互绑)。
 * @param identity - 身份替换主词(=插件 id;未指定时由调用方回落为目录名)
 * @param meta - 可选项目元信息:有值时写入生成物 package.json 的对应字段(案例默认值被覆盖)
 * @returns 拷贝的文件清单(相对 targetDir,字典序)
 */
export function copyScenarioCase(
    caseId: string,
    targetDir: string,
    identity: string,
    meta?: { description?: string; author?: string; pkgName?: string },
): string[] {
    const sourceDir = join(casesRoot(), caseId);
    if (!existsSync(sourceDir)) {
        throw new Error(
            t("errors.caseMissing", { name: caseId, cases: listScenarioCases().join(", ") }),
        );
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

    // README 单语言交付:按生成时刻的语言保留对应素材(素材对 README.md/README.en.md 成对入库),
    // 未选中的那份删除,选中的若是 en 版改名为 README.md
    {
        const zhReadme = join(targetDir, "README.md");
        const enReadme = join(targetDir, "README.en.md");
        if (getLang() === "en") {
            if (existsSync(enReadme)) {
                rmSync(zhReadme, { force: true });
                renameSync(enReadme, zhReadme);
            }
        } else if (existsSync(enReadme)) {
            rmSync(enReadme);
        }
    }

    const files: string[] = [];
    // 词边界替换(非纯子串):语义名若以案例 id 作前缀(如 notebookService),
    // 后面跟字母时边界断言失败不被误换;身份字段(插件 id/patch id/日志前缀等独立词)照常替换。
    // 案例 id 仅含小写字母与连字符,作为正则模式无特殊字符风险。
    const caseIdPattern = new RegExp(`\\b${caseId}\\b`, "g");
    walk(targetDir, (file) => {
        files.push(relative(targetDir, file));
        if (identity !== caseId) {
            const text = readFileSync(file, "utf8");
            if (text.includes(caseId)) {
                writeFileSync(file, text.replaceAll(caseIdPattern, identity));
            }
        }
    });

    // dev.patch.yml 由 CLI 现场生成而非随案例入库(内含本机绝对路径,gitignore 约定不入库,
    // 但案例 README 的调试步骤引用它)。以案例自己的 cordis.patch.yml 为底——id 已随身份重写、
    // config 块原样保留——仅把 name 换成源码入口绝对路径(直载 .ts,Node ESM 不支持目录导入)。
    const distPatch = join(targetDir, "cordis.patch.yml");
    if (!existsSync(distPatch)) {
        throw new Error(t("errors.patchMissing", { name: caseId }));
    }
    const body = readFileSync(distPatch, "utf8");
    const insertAt = body.indexOf("- insert:");
    if (insertAt < 0) {
        throw new Error(t("errors.insertMissing", { name: caseId }));
    }
    const entryFile = resolve(targetDir, "src/index.ts");
    const named = body
        .slice(insertAt)
        .replace(/^(\s*name: ')[^']*(')$/m, `$1${entryFile}$2`);
    writeFile(
        targetDir,
        "dev.patch.yml",
        [...DEV_PATCH_NOTES, named].join("\n") + "\n",
    );
    files.push("dev.patch.yml");

    // 项目元信息:描述/作者/包名与身份无关,是用户自己的信息,有值时覆盖案例默认值
    // (包名默认=身份词,未显式给出时不写,保持替换产物一致)
    if (meta?.description || meta?.author || meta?.pkgName) {
        const pkgPath = join(targetDir, "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<
            string,
            unknown
        >;
        if (meta.description) pkg.description = meta.description;
        if (meta.author) pkg.author = meta.author;
        if (meta.pkgName) pkg.name = meta.pkgName;
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    }

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
