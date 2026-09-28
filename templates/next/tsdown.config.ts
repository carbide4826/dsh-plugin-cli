import { defineConfig } from 'tsdown'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export default defineConfig([
    {
        entry: {{ENTRIES}},
        outDir: 'dist',
        format: 'esm',
        dts: false,
        outExtensions: () => ({ js: '.js' }),
    }{{CLIENT_SEGMENT}}
])
