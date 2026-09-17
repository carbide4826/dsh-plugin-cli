// TODO: 替换成你的工具调用视图(展示调用参数/进度/结果)
import { memo } from 'react'
import styles from './ToolView.module.css'

export const ToolView = memo(function ToolView() {
    return (
        <div className={styles.card}>{'{{PLUGIN_ID}} tool view'}</div>
    )
})
