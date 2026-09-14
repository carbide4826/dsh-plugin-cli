import { Context, Service } from '@deepseek-ai/cordis'
import type { AgentHandle } from '@deepseek-ai/dsh-agent'
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'

/**
 * Bot 服务:每个会话持有一个 agent 代理,负责把插件的自动回复投递进会话。
 * 卸载随所属 fiber 自动清理,无需手动管理生命周期。
 */
export class BotService extends Service {
    // agent 能力来自宿主 agents 服务(决定加载顺序)
    static inject: readonly string[] = ['agents']

    // 会话 id → 已创建的 agent 句柄(一会话一代理,复用避免重复 create)
    private readonly handles = new Map<string, AgentHandle>()

    constructor(ctx: Context) {
        super(ctx, 'session-bot')
    }

    /** 向指定会话投递一条插件来源的自动回复 */
    async say(sessionId: SessionId, text: string): Promise<void> {
        let handle = this.handles.get(sessionId)
        if (handle === undefined) {
            handle = await this.ctx.agents.create({ sessionId })
            this.handles.set(sessionId, handle)
        }
        handle.agent.followup(
            createUserMessage({
                content: [{ type: 'text', text }],
                source: {
                    kind: 'plugin',
                    plugin: 'session-bot',
                    form: 'notice',
                    summary: boundContextSummary(text), // 摘要超 120 字符自动截断
                },
            }),
        )
    }
}

// 声明合并:让事件监听等处能用 ctx.sessionBot 访问本服务
declare module '@deepseek-ai/cordis' {
    interface Context {
        sessionBot: BotService
    }
}
