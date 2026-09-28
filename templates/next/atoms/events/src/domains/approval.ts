import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-user-approval' // 事件类型来源

/**
 * approval 域监听(审批瀑布)。
 * 返回裁决即认领本次请求;next() 表示交给链上的下一个应答者。
 * 裁决值:'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'
 * @param ctx - Cordis 上下文
 */
export function registerApprovalListeners(ctx: Context): void {
    ctx.on('approval/request', async (req, next) => {
        // req.toolName = 被审批的工具;TODO: 你的审批策略(或转发到自己的 UI)
        if (req.toolName === 'TODO_blocked_tool') {
            return 'rejected'
        }
        return next()
    })
}
