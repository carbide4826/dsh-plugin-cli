// 【M2-c】项目生成编排:base 模板渲染 + 原子文件拷贝 + 动态文件写入,产出完整生成项目
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Answers } from "../domain/types";
import { collectDeps } from "../domain/deps";
import { planGeneration } from "../atoms";
import { renderString, writeFile, type Vars } from "../render/render";
import { buildVars } from "./vars";
import { generatePackageJson } from "./packageJson";
import { generateCordisPatch, generateDevPatch } from "./patches";
import { generateAggregator, generateHostIndex } from "./indexTs";

// base 平铺模板文件(templates/ 根与 atoms/scenarios 混居,故显式列文件而非整目录渲染)
const BASE_FILES = ["tsconfig.json", "README.md", ".gitignore", "tsdown.config.ts"] as const;

// templates/ 目录锚点:src 下与打包后的 dist 深度不同,向上探测到含 atoms 的 templates 为止
let cachedRoot: string | undefined;
function templatesRoot(): string {
    if (cachedRoot !== undefined) return cachedRoot;
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i++) {
        const candidate = join(dir, "templates");
        if (existsSync(join(candidate, "README.md")) && existsSync(join(candidate, "atoms"))) {
            cachedRoot = candidate;
            return cachedRoot;
        }
        dir = dirname(dir);
    }
    throw new Error("未找到 templates/ 目录(渲染素材缺失)");
}

/** 读模板文本;缺失直接抛错(渲染素材缺失是发布事故,不能静默) */
function readTemplate(path: string): string {
    if (!existsSync(path)) throw new Error(`模板文件缺失: ${path}`);
    return readFileSync(path, "utf8");
}

/**
 * 生成完整项目到目标目录
 * @param answers - 完整问卷答案
 * @param targetDir - 目标目录(需已存在或可创建)
 * @returns 实际写入的文件相对路径清单(供完成提示展示)
 */
export function writeProject(answers: Answers, targetDir: string): string[] {
    const written: string[] = [];
    const plan = planGeneration(answers);
    const deps = collectDeps(answers);
    const vars: Vars = buildVars(answers, plan.readmeStructure.join("\n"));
    const root = templatesRoot();

    // ① base 模板(tsconfig / README / .gitignore)
    for (const base of BASE_FILES) {
        writeFile(targetDir, base, renderString(readTemplate(join(root, base)), vars));
        written.push(base);
    }

    // ② 原子实现文件(拷贝 + 占位符渲染;copy.from 相对 templates/atoms/)
    for (const c of plan.copy) {
        writeFile(targetDir, c.to, renderString(readTemplate(join(root, "atoms", c.from)), vars));
        written.push(c.to);
    }

    // ③ 动态文件:package.json / patch / 入口 / 聚合
    writeFile(targetDir, "package.json", generatePackageJson(answers, deps));
    written.push("package.json");

    if (answers.pkgPosition === "bundle") {
        writeFile(targetDir, "cordis.patch.yml", generateCordisPatch(answers));
        written.push("cordis.patch.yml");
    }
    writeFile(targetDir, "dev.patch.yml", generateDevPatch(answers, resolve(targetDir, "src/index.ts")));
    written.push("dev.patch.yml");

    writeFile(targetDir, "src/index.ts", generateHostIndex(answers, plan.index));
    written.push("src/index.ts");
    for (const agg of plan.aggregates) {
        writeFile(targetDir, agg.file, generateAggregator(agg));
        written.push(agg.file);
    }

    return written;
}
