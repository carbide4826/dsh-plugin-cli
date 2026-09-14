// 【M2-c】占位符变量表:问卷答案 + 版本常量 → 渲染引擎的 Vars
import type { Answers } from "../domain/types";
import { SUPPORTED_CORDIS_VERSION, SUPPORTED_DSH_VERSION } from "../domain/deps";
import type { Vars } from "../render/render";

/**
 * client 出口的 tsdown 配置段(勾 UI 时注入,前导逗号与 host 段拼成多配置数组)。
 * 协议:client 产物必须是 window.__ModuleLoader__.load({id, factory}) 注册式——
 * 聚合加载器在非 ESM 上下文执行各包 client.js,纯 ESM 的 export 语句会让整个聚合炸掉;
 * react 系必须 external(宿主经 factory 的 require 供应,打进 bundle 会双实例)。
 * 实现 = CJS 格式 + banner/footer 套官方同款外壳;id 用包名(宿主按包名聚合)。
 */
function clientSegment(pkgName: string): string {
    const banner = [
        "window.__ModuleLoader__.load({",
        `  id: "${pkgName}",`,
        "  factory: (require) => {",
        "    var module = { exports: {} };",
        "    var exports = module.exports;",
        '    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
    ].join("\n");
    const footer = ["", "    return module.exports;", "  }", "});"].join("\n");
    // 首元素带前导逗号:与 host 段拼成数组的第二个元素
    return [
        ",",
        "    {",
        "        // client 出口:注册式 CJS(见文件头注释);react 系 external 防双实例",
        "        entry: { client: 'src/client/index.ts' },",
        "        outDir: 'dist',",
        "        format: 'cjs',",
        "        dts: false,",
        "        outExtensions: () => ({ js: '.js' }),",
        "        external: ['react', 'react-dom', 'react/jsx-runtime'],",
        `        banner: ${JSON.stringify(banner)},`,
        `        footer: ${JSON.stringify(footer)},`,
        "        clean: false,",
        "    }",
    ].join("\n");
}

/**
 * 组装渲染变量表(模板文件与动态文件共用同一套占位符)
 * @param answers - 完整问卷答案
 * @param extraStructure - README「代码结构」段追加行(来自生成计划)
 * @returns 渲染变量表
 */
export function buildVars(answers: Answers, extraStructure: string): Vars {
    const ui = answers.atoms.includes("ui");
    return {
        DIR_NAME: answers.dirName,
        PKG_NAME: answers.pkgName,
        PLUGIN_ID: answers.pluginId,
        TOOL_NAME: answers.toolName,
        DESCRIPTION: answers.description,
        AUTHOR: answers.author,
        DSH_VERSION: SUPPORTED_DSH_VERSION,
        CORDIS_VERSION: SUPPORTED_CORDIS_VERSION,
        CONFIG_MODE: answers.config,
        EXTRA_STRUCTURE: extraStructure,
        // 项目自带 tsdown 配置(就近优先),避免被祖先目录的 tsdown.config.ts 劫持 entry。
        // host 出口 UI 时用对象形式:key 即输出文件名(index → dist/index.js 平铺,
        // 数组形式会保持目录结构,与 exports 声明错位)
        ENTRIES: ui ? "{ index: 'src/index.ts' }" : "['src/index.ts']",
        CLIENT_SEGMENT: ui ? clientSegment(answers.pkgName) : "",
    };
}
