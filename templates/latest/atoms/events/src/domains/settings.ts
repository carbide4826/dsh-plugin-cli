import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings' // 事件类型来源

/**
 * settings 域监听(设置变更通知,响应式配置)。
 * @param ctx - Cordis 上下文
 */
export function registerSettingsListeners(ctx: Context): void {
    // emit:某命名空间的解析值发生变化(深比较门控,值真变了才发)
    ctx.on('settings/updated', (ns, next, prev, source) => {
        // TODO: 响应配置变化(如热更新自己的行为)
        console.log(`[{{PLUGIN_ID}}] settings ${ns} changed (${String(prev)} -> ${String(next)}, via ${source})`)
    })
}
