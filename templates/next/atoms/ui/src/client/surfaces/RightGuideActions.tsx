import { memo } from 'react'
import { MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import styles from './RightGuideActions.module.css'

/** 宿主给的槽位 props(菜单项 id、打开/固定/关闭回调) */
type RightGuideActionsProps = PropsRuntime<'sidebar.right.tab.guide.actions'>

/**
 * 右侧栏 guide 卡片的 More 菜单里的一行。
 *
 * 宿主的 props 里还有 entries / onOpen / onPinnedChange(被折叠的会话视图),
 * 官方 ui-entry-customization 已在同一区域渲染了那部分;这里只放自己的一行,
 * 再渲染 entries 会与官方那行显示重复。
 *
 * @param props - 宿主槽位 props
 * @returns 菜单行
 */
export const RightGuideActions = memo(function RightGuideActions({ onDismiss }: RightGuideActionsProps) {
    return (
        <MenuItemButton onSelect={() => {
                onDismiss()
                // 在这里换成你的动作:打开自己的面板、跑一条命令、发一个事件……
            }}>
            <span className={styles.entry}>{'{{PLUGIN_ID}}'}</span>
        </MenuItemButton>
    )
})
