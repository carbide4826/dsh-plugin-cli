import type { Context } from '@deepseek-ai/cordis'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'

/**
 * 缝扩展:注册 LLM 适配器,接入新的模型/供应商。
 * 注意(替换成真实 provider 调用时):
 * 1. 每个 provider HTTP 请求必须带 attributionHeaders()(官方硬性约束);
 * 2. stream 必须尊重 options.signal(取消);
 * 3. finish chunk 的 reason 可选 stop / tool-calls / max-tokens / aborted / error。
 * @param ctx - Cordis 上下文
 */
export function registerLlmSeam(ctx: Context): void {
    ctx.llm.registerAdapter(['{{PLUGIN_ID}}'], new ExampleAdapter())
}

/** 回显适配器:不发 HTTP 请求,生成即可运行 */
class ExampleAdapter extends LlmAdapter {
    /** provider 显示名(选择器/诊断用);默认实现会用 route id 兜底 */
    override providerInfo(provider: string) {
        return { id: provider, name: 'My Plugin (echo)' }
    }

    /**
     * 模型目录数据源:Web 端模型选择器的分组由本方法返回值聚合而成,
     * 默认空实现 = 选择器里不出现本 provider。清单可硬编码,也可读插件 Config。
     */
    override async listModels(provider: string) {
        return [
            {
                provider,
                id: 'echo',
                name: 'Echo',
                description: '回显模型:原样返回 provider/model,用于链路验证',
            },
        ]
    }

    override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
        // TODO: 替换为你的真实 provider HTTP 调用
        yield {
            type: 'text-delta',
            index: 0,
            text: `[{{PLUGIN_ID}} adapter] ${options.provider} / ${options.model}`,
        }
        yield { type: 'finish', reason: { kind: 'stop' } }
    }
}
