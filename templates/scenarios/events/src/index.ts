// {{PKG_NAME}} — 事件监听插件入口。
// ctx.on 是上下文原生能力,不需要注入服务;apply 里挂好监听器即可。
import type { Context } from '@deepseek-ai/cordis'
import { registerEventListeners } from './events.ts'

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = '{{PLUGIN_ID}}'

/**
 * 注册事件监听:具体拦截点见 ./events.ts(替换成你要监听的事件即可,入口不用动)。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    registerEventListeners(ctx)
}
