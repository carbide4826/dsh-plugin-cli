import { memo } from 'react'
import { MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import styles from './SidebarActions.module.css'

/** 宿主给的槽位 props(菜单项 id、打开/固定/关闭回调) */
type SidebarActionsProps = PropsRuntime<'sidebar.panellist.actions'>

/**
 * 左侧栏面板行的 More 菜单里的一行。
 * @param props - 宿主槽位 props
 * @returns 菜单行
 */
export const SidebarActions = memo(function SidebarActions({ onDismiss }: SidebarActionsProps) {
    return (
        <MenuItemButton onSelect={() => { onDismiss(); /* TODO: 换成你要触发的动作 */ }}>
            <span className={styles.entry}>{'{{PLUGIN_ID}}'}</span>
        </MenuItemButton>
    )
})
