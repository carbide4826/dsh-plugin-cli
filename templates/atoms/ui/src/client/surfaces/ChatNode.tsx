// TODO: 替换成你的会话节点渲染(props 由槽位 inject face 决定)
import { memo } from 'react'

export const ChatNode = memo(function ChatNode() {
    return (
        <div style={{ padding: '4px 8px', fontSize: 12, opacity: 0.8 }}>
            {'{{PLUGIN_ID}} chat node'}
        </div>
    )
})
