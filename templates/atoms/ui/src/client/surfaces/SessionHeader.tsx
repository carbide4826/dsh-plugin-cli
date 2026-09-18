import { memo } from 'react'
import styles from './SessionHeader.module.css'

export const SessionHeader = memo(function SessionHeader() {
    return (
        <div className={styles.header}>{'{{PLUGIN_ID}} header'}</div>
    )
})
