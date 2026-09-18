import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { SettingsCard } from './SettingsCard.tsx'

/**
 * 注册设置卡片:渲染进设置页的本插件区块。
 * @param ctx - client 根上下文
 */
export function registerSettingsCard(ctx: Context): void {
    ctx.slots.inject('settings.plugin.item', () =>
        ctx.slots.register(
            {
                name: 'settings.plugin.item',
                key: 'model-gateway', // namespace = join key,必须与 host 侧声明一致
                priority: 100, // keyed 槽选项只有 key/priority(无 order,那是 list 槽);同 key 同 priority 会 throw
                // 面数据不走注册项 inject:组件 props = owner props,业务数据经 apply 闭包的 ctx 拿
            },
            SettingsCard,
        ))
}
