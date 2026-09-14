// {{PLUGIN_ID}} — 示例适配器:回显流(不需要 API key,生成即可运行)。
// 替换成你的真实 provider 调用时注意:
// 1. 每个 provider HTTP 请求必须带 attributionHeaders()(官方硬性约束);
// 2. stream 必须尊重 options.signal(取消);
// 3. finish chunk 的 reason 可选 stop / tool-calls / max-tokens / aborted / error。
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'

/**
 * 示例适配器:不发起任何 HTTP 请求,把最后一条用户消息回显成流。
 * 继承 LlmAdapter 后,providerInfo / listModels / resolveModel / prepareCall
 * 都有框架默认实现,唯一必须实现的是 stream()。
 */
export class ExampleAdapter extends LlmAdapter {
    /**
     * 流式返回模型输出:唯一必须实现的方法。
     * @param options - 组装完成的请求(provider、model、messages、signal 等)
     */
    override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
        // TODO: 替换为你的真实 provider HTTP 调用
        const reply = [
            `[{{PLUGIN_ID}} example adapter]`,
            `provider: ${options.provider} / model: ${options.model}`,
            `received ${options.messages.length} message(s).`,
            'Replace ExampleAdapter.stream() with your real provider call.',
        ].join('\n')

        // 一次 text-delta 即可,真实实现按 provider 的流式分片逐块 yield
        yield { type: 'text-delta', index: 0, text: reply }
        yield { type: 'finish', reason: { kind: 'stop' } }
    }
}
