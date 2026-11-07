import { memo } from 'react'
import styles from './ToolView.module.css'

export const ToolView = memo(function ToolView() {
    return (
        <div className={styles.card}>{'{{PLUGIN_ID}} · 工具调用视图(替换成你的内容)'}</div>
    )
})
