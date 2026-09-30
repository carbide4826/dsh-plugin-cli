import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client' // settings.plugins.tab 槽型声明来源
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { SettingsCard } from './SettingsCard.tsx'

/**
 * 注册插件设置页签:渲染进设置页 Plugins 区块的本插件页签(0.1.7 list 页签槽)。
 * @param ctx - client 根上下文
 */
export function registerSettingsCard(ctx: Context): void {
    ctx.slots.inject('settings.plugins.tab', () =>
        ctx.slots.register(
            {
                name: 'settings.plugins.tab',
                id: '{{PLUGIN_ID}}', // 页签 id:页签列表内唯一(官方 inventory 页签用 'all')
                order: 100, // 页签排序:list 槽选项用 id/order(keyed 槽的 key/priority 在此不存在)
                label: () => '{{PLUGIN_ID}}', // 页签标题,宿主 resolveSlotLabel 解析为字符串
            },
            SettingsCard,
        ))
}
