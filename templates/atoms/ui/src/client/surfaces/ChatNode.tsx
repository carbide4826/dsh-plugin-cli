// TODO: 替换成你的会话节点渲染(props 由槽位 inject face 决定)
import { memo } from 'react'
import styles from './ChatNode.module.css'

export const ChatNode = memo(function ChatNode() {
    return (
        <div className={styles.node}>{'{{PLUGIN_ID}} chat node'}</div>
    )
})
