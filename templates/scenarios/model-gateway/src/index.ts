import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-settings' // ctx.settings 的类型来源(动态配置)
import { ExampleService } from "./service.ts"
import { registerServiceSeams } from "./seams/index.ts"
import { setGatewayConfig } from "./seams/llm.ts"

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = 'model-gateway'

// 要求就绪的服务(决定加载顺序)
export const inject = ['llm', 'settings']

/** 网关接入配置(动态:换网关/换 key 的环境变量名无需重启)。 */
export interface Config {
    /** 存放网关 API Key 的环境变量名(官方 apiKeyEnv 同款;key 本身不落盘) */
    apiKeyEnv: string
    /** 网关 base URL(真实实现在此发 HTTP 请求) */
    baseUrl: string
    /** 模型选择器里展示的模型名 */
    model: string
}

export const Config: z<Config> = z.object({
    apiKeyEnv: z.string().default('GATEWAY_API_KEY'),
    baseUrl: z.string().default('https://gateway.example.com/v1'),
    model: z.string().default('gateway-chat'),
})

/**
 * 插件入口:各能力的注册调用。
 * @param ctx - Cordis 上下文
 * @param config - 已解析的插件配置
 */
export function apply(ctx: Context, config: Config): void {
    ctx.plugin(ExampleService) // 挂载自有服务

    // 配置 → 适配器:初始注入 + 运行时热更新都走同一个入口
    setGatewayConfig(config)
    registerServiceSeams(ctx)

    // 动态配置:注册 settings section;部署侧 provider(dsh-settings-file)变更时热更新
    let getSource: () => Config = () => config
    ctx.settings.installSection(ctx, 'model-gateway', Config, config, {
        setSource: (source) => {
            getSource = source
        },
        onChange: () => {
            const current = getSource()
            setGatewayConfig(current) // 换 key/换网关即刻生效,不用重启
            console.log(`[model-gateway] 配置已热更新 → ${current.baseUrl} / ${current.model}`)
        },
    })
}
