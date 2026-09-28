import type { Context } from '@deepseek-ai/cordis'
import { registerLlmSeam } from "./llm.ts"

/**
 * 注册已选能力缝。
 * @param ctx - Cordis 上下文
 */
export function registerServiceSeams(ctx: Context): void {
    registerLlmSeam(ctx) // 缝:模型接入(llm)
}
