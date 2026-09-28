import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent' // 事件类型来源

/**
 * agent 域监听(代表事件:1 个 waterfall + 1 个 emit)。
 * @param ctx - Cordis 上下文
 */
export function registerAgentListeners(ctx: Context): void {
    // waterfall 步前钩子:每步进入前调用;next() 放行当前消息批次
    ctx.on('agent/pre-step', async (payload, next) => {
        // payload.agent / payload.messages / payload.turn / payload.step
        // TODO: 步前检查、注入上下文等
        return next()
    })

    // emit 观察:agent 状态切换(idle/running/...)
    ctx.on('agent/status', (payload) => {
        // TODO: 状态展示、指标采集等
        console.log(`[{{PLUGIN_ID}}] agent status -> ${payload.status}`)
    })
}
