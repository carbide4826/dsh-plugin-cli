// webhook-bridge — 插件入口。
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { registerEventListeners } from "./events.ts"
import { registerProtocol } from "./protocol.ts"

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = 'webhook-bridge'

// 要求就绪的服务(决定加载顺序)
export const inject = ['agents', 'workspaceRegistry', 'agentDefaultModel']

/** 插件配置(静态:写进 cordis.yml,加载时生效)。 */
export interface Config {
    /** webhook 监听端口 */
    port: number
}

export const Config: z<Config> = z.object({
    port: z.number().default(8787),
})

/**
 * 插件入口:各原子的注册调用(由 dshp 按勾选拼装)。
 * @param ctx - Cordis 上下文
 * @param config - 已解析的插件配置
 */
export function apply(ctx: Context, config: Config): void {
    registerEventListeners(ctx)
    registerProtocol(ctx, config.port)
}
