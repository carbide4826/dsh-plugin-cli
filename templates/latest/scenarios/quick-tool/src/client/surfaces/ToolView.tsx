import { memo } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import styles from './ToolView.module.css'

/** 从结果 content 里取第一个 text 块(RunningToolCall 不带 kind,只能用 in 判别已落地的 ToolResultNode) */
function resultText(block: ToolCallViewProps['block']): string | null {
    if (!('kind' in block)) return null
    for (const part of block.content) {
        if ('text' in part && typeof part.text === 'string') return part.text
    }
    return null
}

export const ToolView = memo(function ToolView(props: ToolCallViewProps) {
    const running = !('kind' in props.block)
    const failed = 'kind' in props.block && props.block.isError
    const text = resultText(props.block)

    return (
        <div className={styles.card}>
            <div className={styles.title}>
                {running ? '⏳ count_chars 统计中…' : failed ? '❌ count_chars 失败' : '✅ count_chars'}
            </div>
            {text !== null && <div className={styles.result}>{text}</div>}
        </div>
    )
})
