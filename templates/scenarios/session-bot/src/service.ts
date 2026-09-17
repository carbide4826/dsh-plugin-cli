import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'

/**
 * 把插件的自动回复直接写入会话日志(surface 追加,轨迹里以「上下文注入 <插件名>」可见)。
 * 不走 agent 轮次、不调模型。
 *
 * ⚠️ 实测(0.1.5-rc.2)三条硬约束:
 * 1. 必须用 session.append 落一条 surface 事件;agent.followup 是"排给下一轮的
 *    用户输入"(会开新一轮模型调用),不是回复通道。
 * 2. global 事件回调里禁止读 ctx.<服务属性>——cordis 要求当前激活插件 inject 声明过
 *    该服务,否则抛 "cannot get property ... without inject" 且被 containment 静默吞掉
 *    (logger.warn 不进终端 stdout)。所以这里用纯函数,由监听器闭包直接引用。
 * 3. 回复以 user-role notice 落盘,会进模型上下文——模型可能读到并响应它,
 *    文案里带"[test-sb] 收到指令"前缀即为此故;不要往里写会诱导模型执行任务的指令文本。
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
