import { defineConfig } from 'tsdown'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// host 出口:ESM(loader 按 exports 解析 dist/index.js)
// client 出口:勾选 UI 时由生成器注入注册式 CJS 段(占位符 CLIENT_SEGMENT),
// 段内含 CSS 内联插件(宿主聚合只拼 client.js,插件 CSS 没有独立文件的加载通道)
// (聚合加载器在非 ESM 上下文执行 client.js,产物必须套 __ModuleLoader__ 外壳)
// 注:非 UI 项目渲染后上方 node:fs / node:path 导入未使用,无害(tsconfig 只查 src)
export default defineConfig([
    {
        entry: {{ENTRIES}},
        outDir: 'dist',
        format: 'esm',
        dts: false,
        outExtensions: () => ({ js: '.js' }), // 钉 .js:与 package.json exports 声明保持一致
    }{{CLIENT_SEGMENT}}
])
