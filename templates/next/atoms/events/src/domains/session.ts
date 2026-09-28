import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-session' // 事件类型来源

/**
 * session 域监听(代表事件:2 个 emit)。
 * @param ctx - Cordis 上下文
 */
export function registerSessionListeners(ctx: Context): void {
    // emit:会话创建并公布
    ctx.on('session/created', (session) => {
        // TODO: 初始化该会话的插件状态
        console.log(`[{{PLUGIN_ID}}] session created: ${session.id}`)
    })

    // emit:会话日志追加(post-commit;监听器失败被 containment,不影响提交)
    ctx.on('session/event', (session, event) => {
        // TODO: 按事件类型做投影、统计、转发等
        void session
        void event
    })
}
