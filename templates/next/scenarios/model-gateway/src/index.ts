import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ExampleService } from "./service.ts"
import { registerServiceSeams } from "./seams/index.ts"
import { setGatewayConfig } from "./seams/llm.ts"

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = 'model-gateway'

// 要求就绪的服务(决定加载顺序)
export const inject = ['llm']

/** 网关接入配置(设置页 Plugins 页签的原生表单编辑,保存后宿主以新配置重跑 apply)。 */
export interface Config {
    /** 存放网关 API Key 的环境变量名(官方 apiKeyEnv 同款;key 本身不落盘) */
    apiKeyEnv: string
    /** 网关 base URL(真实实现在此发 HTTP 请求) */
    baseUrl: string
    /** 模型选择器里展示的模型名 */
    model: string
}

// .volatile():字段进宿主原生配置表单(0.1.7 起 Config schema 由宿主投影,仅 volatile 字段可编辑);
// volatile 会改变 schema 的推断类型,故此处不做 z<Config> 注解(字段名以 interface Config 为准手工对齐)
export const Config = z.object({
    apiKeyEnv: z.string().default('GATEWAY_API_KEY').volatile(),
    baseUrl: z.string().default('https://gateway.example.com/v1').volatile(),
    model: z.string().default('gateway-chat').volatile(),
})

/**
 * 插件入口:各能力的注册调用。
 * @param ctx - Cordis 上下文
 * @param config - 已解析的插件配置
 */
export function apply(ctx: Context, config: Config): void {
    ctx.plugin(ExampleService) // 挂载自有服务

    // 配置 → 适配器:宿主原生配置表单保存后会以新配置重跑 apply,这里即热更新入口
    setGatewayConfig(config)
    registerServiceSeams(ctx)
}
