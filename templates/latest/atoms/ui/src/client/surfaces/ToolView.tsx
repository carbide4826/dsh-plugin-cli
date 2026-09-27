import { memo } from 'react'
import styles from './ToolView.module.css'

export const ToolView = memo(function ToolView() {
    return (
        <div className={styles.card}>{'{{PLUGIN_ID}} tool view'}</div>
    )
})
