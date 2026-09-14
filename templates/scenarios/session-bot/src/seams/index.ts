// 能力缝聚合入口(由 dshp 生成):每缝一行调用,实现见同目录 *.ts。
// 各缝要求的服务就绪已并入插件入口的 inject。
import type { Context } from '@deepseek-ai/cordis'
import { registerLlmSeam } from "./llm.ts"

/**
 * 注册已选能力缝。
 * @param ctx - Cordis 上下文
 */
export function registerServiceSeams(ctx: Context): void {
    registerLlmSeam(ctx) // 缝:模型接入(llm)
}
