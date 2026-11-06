import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client' // sidebar.panellist.actions 槽型声明来源(0.2.1-rc.4 起宿主才有这个槽位)
import { SidebarActions } from './SidebarActions.tsx'

/**
 * 注册左侧栏面板行的 More 菜单里的一项。
 * @param ctx - client 根上下文
 */
export function registerSidebarActions(ctx: Context): void {
    ctx.slots.inject('sidebar.panellist.actions', () =>
        ctx.slots.register(
            {
                name: 'sidebar.panellist.actions',
                id: '{{PLUGIN_ID}}', // 菜单项 id(该区域内唯一)
                inject: () => ({}), // 这个槽位不需要额外注入面
            },
            SidebarActions,
        ))
}
