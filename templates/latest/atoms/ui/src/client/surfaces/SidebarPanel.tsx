import { memo } from 'react'
import styles from './SidebarPanel.module.css'

export const SidebarPanel = memo(function SidebarPanel() {
    return (
        <div className={styles.panel}>{'{{PLUGIN_ID}} · 侧边栏面板(替换成你的内容)'}</div>
    )
})
