// TODO: 替换成你的会话头扩展(动作按钮、角标……)
import { memo } from 'react'
import styles from './SessionHeader.module.css'

export const SessionHeader = memo(function SessionHeader() {
    return (
        <div className={styles.header}>{'{{PLUGIN_ID}} header'}</div>
    )
})
