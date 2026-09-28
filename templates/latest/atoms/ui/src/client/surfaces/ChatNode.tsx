import { memo } from 'react'
import styles from './ChatNode.module.css'

export const ChatNode = memo(function ChatNode() {
    return (
        <div className={styles.node}>{'{{PLUGIN_ID}} chat node'}</div>
    )
})
