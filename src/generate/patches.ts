// 【M2-c】patch 文件生成器:cordis.patch.yml(分发配置层)/ dev.patch.yml(本地调试 overlay)
// 官方格式实锤(dsh-fork bundle/base 等):- insert: [- id, name, config?];patch 按 id 定位整行替换 config,不合并。
import type { Answers } from "../domain/types";

/** ⑤非 none 时给 patch 行带样例 config(键与生成的 Config 样例对应) */
function configYaml(answers: Answers, indent: string): string {
    if (answers.config === "none") return "";
    return `\n${indent}config:\n${indent}  example: 'TODO-按需修改'`;
}

/**
 * 生成 cordis.patch.yml(分发配置层;仅 bundle 定位写入,库包不生成)
 * @param answers - 完整问卷答案
 * @returns 文件内容
 */
export function generateCordisPatch(answers: Answers): string {
    return [
        "# 分发配置层:本插件在 profile 中的注册行(dsh plugin --profile <name> add ./ 后生效)。",
        "# 注意:patch 按 id 定位并整行替换 config,不做合并。",
        "- insert:",
        `    - id: ${answers.pluginId}`,
        `      name: '${answers.pkgName}'${configYaml(answers, "      ")}`,
    ].join("\n") + "\n";
}

// dev.patch.yml 头部说明(预设管线与案例拷贝两条路径共用,避免文案漂移)
export const DEV_PATCH_NOTES = [
    "# 本地调试 overlay:dsh web --patch ./dev.patch.yml 直载源码,无需构建。",
    "# name 指向源码入口文件(必须绝对路径,Node ESM 不支持目录导入)。",
] as const;

/**
 * 生成 dev.patch.yml(本地调试 overlay:直载源码,无需构建)。
 * 官方约定(index.md):name 必须是源码入口文件的绝对路径——Node ESM 不支持目录导入,
 * 指向项目目录会 ERR_UNSUPPORTED_DIR_IMPORT。
 * @param answers - 完整问卷答案
 * @param entryFile - 入口源文件的绝对路径(如 <项目>/src/index.ts)
 * @returns 文件内容
 */
export function generateDevPatch(answers: Answers, entryFile: string): string {
    return [
        ...DEV_PATCH_NOTES,
        "- insert:",
        `    - id: ${answers.pluginId}`,
        `      name: '${entryFile}'${configYaml(answers, "      ")}`,
    ].join("\n") + "\n";
}
