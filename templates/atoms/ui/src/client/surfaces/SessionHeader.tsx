// TODO: 替换成你的会话头扩展(动作按钮、角标……)
import { memo } from 'react'

export const SessionHeader = memo(function SessionHeader() {
    return (
        <div style={{ padding: '4px 8px', fontSize: 12, opacity: 0.8 }}>
            {'{{PLUGIN_ID}} header'}
        </div>
    )
})
