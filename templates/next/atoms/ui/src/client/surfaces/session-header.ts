import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SessionHeader } from './SessionHeader.tsx'

/**
 * 注册会话头扩展(动作/角标)。
 * @param ctx - client 根上下文
 */
export function registerSessionHeader(ctx: Context): void {
    ctx.slots.inject('conversation.session.header', () =>
        ctx.slots.register(
            {
                name: 'conversation.session.header',
                // single 槽 shadowing:最低 priority 者渲染;官方默认注册在 0,-1 才能接管
                priority: -1,
            },
            SessionHeader,
        ))
}
