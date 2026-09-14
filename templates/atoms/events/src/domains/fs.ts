import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs' // 事件类型来源

/**
 * fs 域监听(代表事件:1 个 waterfall + 1 个 emit)。
 * @param ctx - Cordis 上下文
 */
export function registerFsListeners(ctx: Context): void {
    // waterfall 写意图:next() = 无条件放行写入;返回 intent 可设保护版本
    ctx.on('fs/write-intent', async (target, actor, next) => {
        // target = 待写目标;TODO: 写保护、确认门等
        void target
        void actor
        return next()
    })

    // emit 观察:文件存在性/版本的权威观测(必须同步,抛错会使工具调用失败)
    ctx.on('fs/observed', (target, observation, actor) => {
        // TODO: 记录观测等
        void target
        void observation
        void actor
    })
}
