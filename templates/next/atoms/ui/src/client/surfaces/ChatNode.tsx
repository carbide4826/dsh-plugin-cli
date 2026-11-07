import { memo } from 'react'
import styles from './ChatNode.module.css'

export const ChatNode = memo(function ChatNode() {
    return (
        <div className={styles.node}>{'{{PLUGIN_ID}} · 会话节点(替换成你的内容)'}</div>
    )
})
