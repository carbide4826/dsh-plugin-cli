// {{PKG_NAME}} — LLM 适配器插件入口。
// 把你的 provider 路由注册进 llm 服务:注册后,模型的 provider 选项里
// 就会出现 "{{PLUGIN_ID}}" 路由(配合模型列表或直接指定 model id 使用)。
import type { Context } from '@deepseek-ai/cordis'
import { ExampleAdapter } from './adapter.ts'

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = '{{PLUGIN_ID}}'

// llm 服务:注册适配器前必须就绪
export const inject = ['llm']

/**
 * 注册适配器:providers 数组是本插件拥有的路由名(在模型选择里显示)。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    ctx.llm.registerAdapter(['{{PLUGIN_ID}}'], new ExampleAdapter())
}
