// session-bot — 插件入口(由 dshp 按勾选拼装生成)。
import type { Context } from '@deepseek-ai/cordis'
import { registerEventListeners } from "./events.ts"
import { BotService } from "./service.ts"
import { registerServiceSeams } from "./seams/index.ts"

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = 'session-bot'

// 要求就绪的服务(决定加载顺序;agents 供 BotService 投递,llm 供缝扩展)
export const inject = ['agents', 'llm']

/**
 * 插件入口:各原子的注册调用(由 dshp 按勾选拼装)。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    registerEventListeners(ctx)
    ctx.plugin(BotService) // 挂载 bot 服务(事件监听经 ctx.sessionBot 使用)
    registerServiceSeams(ctx)
}
