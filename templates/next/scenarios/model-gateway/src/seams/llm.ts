import type { Context } from '@deepseek-ai/cordis'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'

/** 网关配置(结构与入口的 Config 一致;独立声明避免 seam → 入口的循环引用) */
export interface GatewayConfig {
    /** 存放 API Key 的环境变量名(官方 apiKeyEnv 同款;key 本身不落盘) */
    apiKeyEnv: string
    baseUrl: string
    model: string
}

// 模块级配置座:入口 apply 时注入,动态配置热更新时替换
let config: GatewayConfig = {
    apiKeyEnv: 'GATEWAY_API_KEY',
    baseUrl: 'https://gateway.example.com/v1',
    model: 'gateway-chat',
}

/** 入口把(最新)配置交给适配器 */
export function setGatewayConfig(next: GatewayConfig): void {
    config = next
}

/**
 * 缝扩展:注册 LLM 适配器,接入自有模型网关。
 * 注意(替换成真实 provider 调用时):
 * 1. 每个 provider HTTP 请求必须带 attributionHeaders()(官方硬性约束);
 * 2. stream 必须尊重 options.signal(取消);
 * 3. finish chunk 的 reason 可选 stop / tool-calls / max-tokens / aborted / error。
 * @param ctx - Cordis 上下文
 */
export function registerLlmSeam(ctx: Context): void {
    ctx.llm.registerAdapter(['model-gateway'], new GatewayAdapter())
    // 把 provider 目录注册进 Web UI(设置 → 模型 tab 的提供方列表 + 聊天模型选择器)。
    // ⚠️ 只 registerAdapter 不注册目录 = 模型 tab 和选择器里都看不到本 provider(实测踩坑);
    // pi-ai 同款两件套:registerAdapter(路由)+ registerConfigurableProviders(目录)。
    ctx.llm.registerConfigurableProviders([
        {
            provider: 'model-gateway',
            displayName: 'Model Gateway',
            settingsNs: 'model-gateway', // 模型 tab 读本插件 settings 段展示配置
            settingsPath: [], // Config 段整体即 profile
        },
    ])
}

/**
 * 网关适配器:演示态为回显(不发 HTTP),配置齐全时输出会带上网关信息;
 * 真实实现把 stream 里的 yield 换成对 config.baseUrl 的流式请求即可。
 */
class GatewayAdapter extends LlmAdapter {
    /** provider 显示名(选择器/诊断用);默认实现会用 route id 兜底 */
    override providerInfo(provider: string) {
        return { id: provider, name: 'Model Gateway' }
    }

    /**
     * 模型目录数据源:模型 tab 点开本 provider 时展示的模型列表来自本方法。
     * 模型名读自插件配置(热更新跟随)。
     */
    override async listModels(provider: string) {
        return [
            {
                provider,
                id: config.model,
                name: config.model,
                description: `自有网关模型( echoes via ${config.baseUrl} )`,
            },
        ]
    }

    override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
        // key 从环境变量按请求解析(官方 apiKeyEnv 同款):key 不写进任何配置文件,
        // 换变量名走设置页热更新即可,改 key 值则 export 后重发一条消息即生效
        const apiKey = process.env[config.apiKeyEnv] ?? ''
        if (!apiKey) {
            yield { type: 'text-delta', index: 0, text: `[model-gateway] 环境变量 ${config.apiKeyEnv} 未设置:export 后重发(echo 模式任意非空值即可)。` }
            yield { type: 'finish', reason: { kind: 'stop' } }
            return
        }
        // TODO: 真实实现 = 用该 key 鉴权,POST config.baseUrl,流式转发回复
        yield {
            type: 'text-delta',
            index: 0,
            text: `[model-gateway] ${options.provider} / ${options.model} @ ${config.baseUrl}(echo 模式)`,
        }
        yield { type: 'finish', reason: { kind: 'stop' } }
    }
}
