#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
  .name('dshp')
  .description('Scaffold DeepSeek Harness (dsh) plugin projects interactively')
  .version('0.1.0')

program
  .command('create [name]')
  .description('Create a DSH plugin project skeleton')
  .option('--template <source>', 'use a custom template (local path / git URL / npm package)')
  .action((name: string | undefined) => {
    // M1 里程碑内容:5 问问卷 + 渐进披露交互流,此处为占位。
    console.log(`[dshp] create flow not implemented yet. target: ${name ?? '(will ask)'}`)
  })

program.parseAsync(process.argv)
