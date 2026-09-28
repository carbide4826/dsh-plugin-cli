import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { ChatNode } from './ChatNode.tsx'

/**
 * 注册会话节点渲染器。
 * @param ctx - client 根上下文
 */
export function registerChatNode(ctx: Context): void {
    ctx.slots.inject('conversation.chat.node', () =>
        ctx.slots.register(
            {
                name: 'conversation.chat.node',
                key: '{{PLUGIN_ID}}-node' as never,
                priority: 100,
            },
            ChatNode,
        ))
}
