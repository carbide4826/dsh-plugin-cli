// TODO: 替换成你的侧边栏面板
import { memo } from 'react'
import styles from './SidebarPanel.module.css'

export const SidebarPanel = memo(function SidebarPanel() {
    return (
        <div className={styles.panel}>{'{{PLUGIN_ID}} panel'}</div>
    )
})
