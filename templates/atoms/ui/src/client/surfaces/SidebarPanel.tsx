// TODO: 替换成你的侧边栏面板
import { memo } from 'react'

export const SidebarPanel = memo(function SidebarPanel() {
    return (
        <div style={{ padding: '4px 8px', fontSize: 12, opacity: 0.8 }}>
            {'{{PLUGIN_ID}} panel'}
        </div>
    )
})
