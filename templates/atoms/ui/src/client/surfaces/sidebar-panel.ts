// 侧边栏面板:list 槽位;宿主按 id/order/label 汇总面板列表后分发渲染。
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { SidebarPanel } from './SidebarPanel.tsx'

/**
 * 注册侧边栏面板。
 * @param ctx - client 根上下文
 */
export function registerSidebarPanel(ctx: Context): void {
    ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
            {
                name: 'sidebar.panellist',
                id: '{{PLUGIN_ID}}', // 面板 id(宿主汇总列表用)
                order: 100,
                inject: () => ({}), // TODO: 面数据/动作
            },
            SidebarPanel,
        ))
}
