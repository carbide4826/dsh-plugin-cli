import type { Context } from '@deepseek-ai/cordis'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'

/** 网关配置(结构与入口的 Config 一致;独立声明避免 seam → 入口的循环引用) */
export interface GatewayConfig {
    apiKey: string
    baseUrl: string
    model: string
}

// 模块级配置座:入口 apply 时注入,动态配置热更新时替换
let config: GatewayConfig = {
    apiKey: '',
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
     * 模型目录数据源:Web 端模型选择器的分组由本方法返回值聚合而成,
     * 默认空实现 = 选择器里不出现本 provider。模型名读自插件配置(热更新跟随)。
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
        if (!config.apiKey) {
            yield { type: 'text-delta', index: 0, text: '[model-gateway] 尚未配置 apiKey,请到 设置 → 插件 → model-gateway 填写。' }
            yield { type: 'finish', reason: { kind: 'stop' } }
            return
        }
        // TODO: 真实实现 = 用 config.apiKey 鉴权,POST config.baseUrl,流式转发回复
        yield {
            type: 'text-delta',
            index: 0,
            text: `[model-gateway] ${options.provider} / ${options.model} @ ${config.baseUrl}(echo 模式)`,
        }
        yield { type: 'finish', reason: { kind: 'stop' } }
    }
}
