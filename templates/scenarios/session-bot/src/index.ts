import type { Context } from '@deepseek-ai/cordis'
import { registerEventListeners } from "./events.ts"
import { registerServiceSeams } from "./seams/index.ts"

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = 'session-bot'

// 要求就绪的服务(决定加载顺序;llm 供缝扩展)
export const inject = ['llm']

/**
 * 插件入口:各能力的注册调用。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    registerEventListeners(ctx)
    registerServiceSeams(ctx)
}
