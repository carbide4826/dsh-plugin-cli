// quick-tool — 插件入口(由 dshp 按勾选拼装生成)。
import type { Context } from '@deepseek-ai/cordis'
import { registerTool } from "./tool.ts"

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = 'quick-tool'

// 要求就绪的服务(决定加载顺序)
export const inject = ['tools']

/**
 * 插件入口:各原子的注册调用(由 dshp 按勾选拼装)。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    registerTool(ctx)
}
