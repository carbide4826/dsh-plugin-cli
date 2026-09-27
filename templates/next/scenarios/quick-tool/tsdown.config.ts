import { defineConfig } from 'tsdown'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export default defineConfig([
    {
        entry: { index: 'src/index.ts' },
        outDir: 'dist',
        format: 'esm',
        dts: false,
        outExtensions: () => ({ js: '.js' }),
    },
    {
        entry: { client: 'src/client/index.ts' },
        outDir: 'dist',
        format: 'cjs',
        dts: false,
        outExtensions: () => ({ js: '.js' }),
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        banner: "window.__ModuleLoader__.load({\n  id: \"quick-tool\",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n    Object.defineProperty(exports, Symbol.toStringTag, { value: \"Module\" });",
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
                    '  var k = \'style[data-plugin-css="quick-tool"]\'',
                    "  if (d.querySelector(k)) return",
                    "  var s = d.createElement(\"style\")",
                    '  s.dataset.plugin = "quick-tool"',
                    '  s.dataset.pluginCss = "quick-tool"',
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
