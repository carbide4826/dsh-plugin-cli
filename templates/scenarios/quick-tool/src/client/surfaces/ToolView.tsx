// count_chars 的调用卡片:keyed 槽位按工具名分发,注册后整卡接管默认渲染。
// props 契约 = ToolCallViewProps:callId / toolName / block(冻结的运行中或已落定调用节点),
// 视图是 block 的纯函数——运行中、失败、成功三种形态都从这里读出。
import { memo } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'

/** 从结果 content 里取第一个 text 块(defensive:内容块形状后续可能扩展) */
function resultText(block: ToolCallViewProps['block']): string | null {
    if (block.kind !== 'tool-result') return null
    for (const part of block.content) {
        if ('text' in part && typeof part.text === 'string') return part.text
    }
    return null
}

export const ToolView = memo(function ToolView(props: ToolCallViewProps) {
    const running = props.block.kind !== 'tool-result'
    const failed = props.block.kind === 'tool-result' && props.block.isError
    const text = resultText(props.block)

    return (
        <div
            style={{
                margin: '4px 0',
                padding: '8px 12px',
                fontSize: 12,
                lineHeight: 1.6,
                border: '1px solid #d0d7de',
                borderRadius: 8,
                background: '#f6f8fa',
            }}
        >
            <div style={{ fontWeight: 600, opacity: 0.75 }}>
                {running ? '⏳ count_chars 统计中…' : failed ? '❌ count_chars 失败' : '✅ count_chars'}
            </div>
            {text !== null && <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>}
        </div>
    )
})
