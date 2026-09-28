import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { ToolView } from './ToolView.tsx'

/**
 * 注册工具调用视图。
 * @param ctx - client 根上下文
 */
export function registerToolView(ctx: Context): void {
    ctx.slots.inject('tool.call.toolview', () =>
        ctx.slots.register(
            {
                name: 'tool.call.toolview',
                key: 'count_chars', // 要接管展示的工具名(与 Tool 原子的 toolName 对应);同 key 覆盖默认渲染
                priority: 100,
            },
            ToolView,
        ))
}
