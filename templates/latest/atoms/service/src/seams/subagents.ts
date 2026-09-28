import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentHandle } from '@deepseek-ai/dsh-agent'
import { createUserMessage, type ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { ResolvedSubagentStartRequest, SubagentProvider, SubagentResult, SubagentRun } from '@deepseek-ai/dsh-subagent'

/**
 * 缝扩展:注册子代理提供者。
 * 下面的最小实现 = 本进程派生一次性子代理(参考官方 subagent-in-process-driver 的精简版):
 * 建 child → followup(prompt) → whenIdle() → 结算。
 * 需要结构化输出/继承上下文等能力时,把 capabilities 对应项打开并补实现。
 * @param ctx - Cordis 上下文
 */
export function registerSubagentsSeam(ctx: Context): void {
    const provider: SubagentProvider = {
        name: '{{PLUGIN_ID}}', // 注册名(模型侧 spawn 工具以此选择提供者)
        capabilities: {
            agentOptions: false,
            outputSchema: false,
            depthLimit: false,
            toolFilter: false,
            persona: false,
        },
        inheritsParentContext: false,

        async start(request: ResolvedSubagentStartRequest): Promise<SubagentRun> {
            const childId = `${request.parent.session.id}-{{PLUGIN_ID}}-${randomUUID()}` as SessionId
            const handle = await request.parent.ctx.agents.create({
                sessionId: childId,
                parentAgent: request.parent,
                signal: request.signal,
            })
            return driveRun(handle, childId, request)
        },
    }
    ctx.subagents.registerProvider(provider)
}

/** 单次运行的生命周期:信号接力 → 一轮 → 结算 → 释放 */
function driveRun(handle: AgentHandle, childId: SessionId, request: ResolvedSubagentStartRequest): SubagentRun {
    const child = handle.agent
    const flags = { cancelled: false }
    const onAbort = (): void => {
        flags.cancelled = true
        child.cancel({ kind: 'parent' })
    }
    request.signal.addEventListener('abort', onAbort, { once: true })
    if (request.signal.aborted) onAbort()

    const result: Promise<SubagentResult> = (async () => {
        try {
            if (!flags.cancelled) {
                child.followup(createUserMessage({ content: request.prompt, source: { kind: 'user' } }))
                await child.whenIdle()
            }
            // TODO: 精确回读 child 输出参考官方 subagent-in-process-driver;精简版输出留空
            const output: ContentBlock[] = []
            return {
                output,
                stopReason: flags.cancelled ? 'aborted' : 'completed',
            }
        } finally {
            request.signal.removeEventListener('abort', onAbort)
        }
    })()

    return {
        id: childId,
        localAgent: child,
        result,
        async dispose(): Promise<void> {
            request.signal.removeEventListener('abort', onAbort)
            flags.cancelled = true
            await handle.dispose()
            await result
        },
    }
}
