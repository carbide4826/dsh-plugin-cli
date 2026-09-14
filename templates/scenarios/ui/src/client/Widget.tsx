// {{PLUGIN_ID}} 的 dock 挂件示例:替换成你的业务组件。
// props 由槽位的 inject face 决定(见 index.ts 的 inject 回调);
// 更复杂的业务数据走 useProjection / ctx.remote(参考官方 ui-goal)。
import { memo } from 'react'

/** 你的挂件组件:替换成你的业务 UI */
export const MyWidget = memo(function MyWidget() {
    return (
        <div style={{ padding: '4px 8px', fontSize: 12, opacity: 0.8 }}>
            {'{{PLUGIN_ID}} widget — replace me'}
        </div>
    )
})
