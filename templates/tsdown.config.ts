import { defineConfig } from 'tsdown'

// host 出口:ESM(loader 按 exports 解析 dist/index.js)
// client 出口:勾选 UI 时由生成器注入注册式 CJS 段(占位符 CLIENT_SEGMENT)
// (聚合加载器在非 ESM 上下文执行 client.js,产物必须套 __ModuleLoader__ 外壳)
export default defineConfig([
    {
        entry: {{ENTRIES}},
        outDir: 'dist',
        format: 'esm',
        dts: false,
        outExtensions: () => ({ js: '.js' }), // 钉 .js:与 package.json exports 声明保持一致
    }{{CLIENT_SEGMENT}}
])
