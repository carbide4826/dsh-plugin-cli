import { defineConfig } from 'tsdown'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// host 出口:ESM(loader 按 exports 解析 dist/index.js)
// client 出口:注册式 CJS(聚合加载器在非 ESM 上下文执行,产物必须套 __ModuleLoader__ 外壳);
// react 系 external 防双实例(宿主经 factory 的 require 供应,打进 bundle 会双实例)
// CSS 内联插件:@tsdown/css 把 .module.css 抽成独立 style.css,而宿主聚合只拼 client.js——
// 写盘后把样式文本回灌到 client.js 尾部(运行时注入 <style>,幂等),再删独立文件。
export default defineConfig([
    {
        entry: { index: 'src/index.ts' },
        outDir: 'dist',
        format: 'esm',
        dts: false,
        outExtensions: () => ({ js: '.js' }), // 钉 .js:与 package.json exports 声明保持一致
    },
    {
        entry: { client: 'src/client/index.ts' },
        outDir: 'dist',
        format: 'cjs',
        dts: false,
        outExtensions: () => ({ js: '.js' }),
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        banner: "window.__ModuleLoader__.load({\n  id: \"model-gateway\",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n    Object.defineProperty(exports, Symbol.toStringTag, { value: \"Module\" });",
        footer: "\n    return module.exports;\n  }\n});",
        clean: false,
        plugins: [{
            name: 'dshp-inline-client-css',
            writeBundle() {
                const cssPath = join('dist', 'style.css')
                if (!existsSync(cssPath)) return
                const css = readFileSync(cssPath, 'utf8')
                const jsPath = join('dist', 'client.js')
                const inject = [
                    "",
                    ";(function () {",
                    "  var d = document",
                    "  if (!d) return",
                    '  var k = \'style[data-plugin-css="model-gateway"]\'',
                    "  if (d.querySelector(k)) return",
                    "  var s = d.createElement(\"style\")",
                    '  s.dataset.plugin = "model-gateway"',
                    '  s.dataset.pluginCss = "model-gateway"',
                    "  s.textContent = " + JSON.stringify(css),
                    "  d.head.appendChild(s)",
                    "})();",
                ].join("\n")
                writeFileSync(jsPath, readFileSync(jsPath, 'utf8') + inject, 'utf8')
                rmSync(cssPath)
            },
        }],
    }
])
