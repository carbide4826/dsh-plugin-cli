import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent' // ctx.agents 的类型来源
import { brandString } from '@deepseek-ai/dsh-brand'
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'

/**
 * 协议桥骨架(参考官方 webhook 包的对接方式):
 * 1. 外部事件到达(你的协议侧:WebSocket / stdin / HTTP 回调……);
 * 2. ctx.agents.create() 建一个 agent(或自己维护复用池);
 * 3. handle.agent.followup() 把外部消息灌进去,agent 照常跑一轮;
 * 4. 需要中断时 handle.agent.cancel()。
 *
 * TODO: 把下面的示例替换成你的协议实现(监听端口、解析报文、维护会话映射)。
 * @param ctx - Cordis 上下文
 */
export function startBridge(ctx: Context): void {
    // TODO: 换成你的协议监听;这里以"收到一条外部消息"为例演示转发
    async function onExternalMessage(text: string): Promise<void> {
        // agentOptions 不填时用默认模型;要指定则传 { provider: '...', model: '...' }
        const handle = await ctx.agents.create({
            sessionId: brandString<SessionId>(`{{PLUGIN_ID}}-${randomUUID()}`),
        })

        // followup 排队一轮新对话;steer/send 用于插话,详见 AgentHandle 类型
        handle.agent.followup(
            createUserMessage({
                content: [{ type: 'text', text }],
                source: {
                    kind: 'plugin',
                    plugin: '{{PLUGIN_ID}}',
                    form: 'notice',
                    summary: boundContextSummary(text), // 摘要超长会自动截断,展示用
                },
            }),
        )
    }

    void onExternalMessage // TODO: 接到你的协议侧后移除
}
