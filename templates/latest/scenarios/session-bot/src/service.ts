import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'

/**
 * 把插件的自动回复直接写入会话日志(surface 追加,轨迹里以「上下文注入 <插件名>」可见)。
 * 不走 agent 轮次、不调模型。
 */
export function sendBotReply(session: Session, text: string): void {
    queueMicrotask(() => {
        try {
            session.append('user/message', createUserMessage({
                content: [{ type: 'text', text }],
                source: {
                    kind: 'plugin',
                    plugin: 'session-bot',
                    form: 'notice',
                    summary: boundContextSummary(text), // 摘要超 120 字符自动截断
                },
            }), { surfaceOp: 'append' })
        } catch (error) {
            console.error('[session-bot] 自动回复失败:', error)
        }
    })
}
