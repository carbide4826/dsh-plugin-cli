import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { InputDock } from './InputDock.tsx'

/**
 * 注册输入区 dock 挂件(list 槽位;官方 GoalBar 同款位置)。
 * @param ctx - client 根上下文
 */
export function registerInputDock(ctx: Context): void {
    ctx.slots.inject('conversation.input.dock', () =>
        ctx.slots.register(
            {
                name: 'conversation.input.dock',
                id: '{{PLUGIN_ID}}', // 同槽去重标识
                order: 100, // 同槽排序(越大越靠后)
                inject: () => ({}), // TODO: 槽位契约定义的面数据/动作
            },
            InputDock,
        ))
}
