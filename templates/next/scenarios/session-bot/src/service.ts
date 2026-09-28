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
                    kind: 'plugin-notice',
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

// 消息来源:0.1.7 起 MessageSourceMap 改为 merge-extensible,无共享 'plugin' kind——
// 插件生产者在自己的模块里声明自己的 kind(官方 webhook 同款),消费方对未知 kind 直接放行
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        /** 插件注入的 notice 消息(协议桥/机器人等程序化生产者) */
        'plugin-notice': {
            readonly kind: 'plugin-notice'
            readonly plugin: string
            readonly form: 'notice'
            readonly summary: string
        }
    }
}
