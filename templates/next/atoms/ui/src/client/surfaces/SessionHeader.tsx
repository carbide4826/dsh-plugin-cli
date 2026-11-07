import { memo } from 'react'
import styles from './SessionHeader.module.css'

export const SessionHeader = memo(function SessionHeader() {
    return (
        <div className={styles.header}>{'{{PLUGIN_ID}} · 会话头(替换成你的内容)'}</div>
    )
})
