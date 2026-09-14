// {{PKG_NAME}} — 工具插件入口。
// 把工具注册进 tools 服务:注册后,模型就能在对话中调用 "{{TOOL_NAME}}"。
import type { Context } from '@deepseek-ai/cordis'
import { registerTool } from './tool.ts'

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = '{{PLUGIN_ID}}'

// tools 服务:注册工具前必须就绪
export const inject = ['tools']

/**
 * 注册工具:具体实现见 ./tool.ts(改 execute 和 schema 即可,入口不用动)。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    registerTool(ctx)
}
