// {{PKG_NAME}} — 协议驱动插件入口。
// 把外部程序/协议桥接进 DSH:注入 agents 服务,为外部事件创建 agent 并驱动它。
import type { Context } from '@deepseek-ai/cordis'
import { startBridge } from './protocol.ts'

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = '{{PLUGIN_ID}}'

// agents 服务:创建 agent 前必须就绪
export const inject = ['agents']

/**
 * 启动协议桥:连接管理、消息转发等在 ./protocol.ts(替换成你的协议实现,入口不用动)。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    startBridge(ctx)
}
