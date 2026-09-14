// service 原子的缝聚合入口:按勾选的能力缝接线,每缝一行调用。
// 生成器只保留被勾选缝的 import 与调用行;缝实现见同目录 *.ts。
// 各缝要求的服务就绪(inject)由生成器并入插件入口的 inject 数组。
import type { Context } from '@deepseek-ai/cordis'
import { registerCommandsSeam } from './commands.ts'
import { registerLlmSeam } from './llm.ts'
import { registerStorageSeam } from './storage.ts'
import { registerSubagentsSeam } from './subagents.ts'
import { registerSystemPromptSeam } from './systemPrompt.ts'
import { registerWebSeam } from './web.ts'

/**
 * 注册全部已选能力缝。
 * @param ctx - Cordis 上下文
 */
export function registerServiceSeams(ctx: Context): void {
    registerLlmSeam(ctx) // 缝:llm(要求 inject llm)
    registerSystemPromptSeam(ctx) // 缝:systemPrompt(要求 inject systemPrompt)
    registerSubagentsSeam(ctx) // 缝:subagents(要求 inject subagents)
    registerWebSeam(ctx) // 缝:web(要求 inject web)
    registerCommandsSeam(ctx) // 缝:commands(要求 inject commands)
    registerStorageSeam(ctx) // 缝:storage(要求 inject storage)
}
