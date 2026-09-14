// TODO: 替换成你的工具调用视图(展示调用参数/进度/结果)
import { memo } from 'react'

export const ToolView = memo(function ToolView() {
    return (
        <div style={{ padding: '4px 8px', fontSize: 12, opacity: 0.8 }}>
            {'{{PLUGIN_ID}} tool view'}
        </div>
    )
})
