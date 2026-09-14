// 会话节点:keyed 槽位,key = 节点类型(官方枚举:tool-call/user/assistant-step 等)。
// rc.2 类型未开放第三方自定义 key(文档已承诺),同 key 注册 = 覆盖该节点渲染器。
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
                // rc.2 类型把 key 钉死在官方节点枚举(自定义节点 key 文档已承诺、类型未开放);
                // 运行时同 key 注册 = 覆盖该节点渲染器。类型放开后移除断言。
                key: '{{PLUGIN_ID}}-node' as never,
                priority: 100,
            },
            ChatNode,
        ))
}
