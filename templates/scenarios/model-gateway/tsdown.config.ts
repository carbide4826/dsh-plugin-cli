import { defineConfig } from 'tsdown'

// host 出口:ESM(loader 按 exports 解析 dist/index.js)
// client 出口:勾选 UI 时由生成器注入注册式 CJS 段(占位符 CLIENT_SEGMENT)
// (聚合加载器在非 ESM 上下文执行 client.js,产物必须套 __ModuleLoader__ 外壳)
export default defineConfig([
    {
        entry: { index: 'src/index.ts' },
        outDir: 'dist',
        format: 'esm',
        dts: false,
        outExtensions: () => ({ js: '.js' }), // 钉 .js:与 package.json exports 声明保持一致
    },
    {
        // client 出口:注册式 CJS(见文件头注释);react 系 external 防双实例
        entry: { client: 'src/client/index.ts' },
        outDir: 'dist',
        format: 'cjs',
        dts: false,
        outExtensions: () => ({ js: '.js' }),
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        banner: "window.__ModuleLoader__.load({\n  id: \"model-gateway\",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n    Object.defineProperty(exports, Symbol.toStringTag, { value: \"Module\" });",
        footer: "\n    return module.exports;\n  }\n});",
        clean: false,
    }
])
