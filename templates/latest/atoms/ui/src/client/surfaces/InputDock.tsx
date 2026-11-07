import { memo } from 'react'
import styles from './InputDock.module.css'

export const InputDock = memo(function InputDock() {
    return (
        <div className={styles.dock}>{'{{PLUGIN_ID}} · 输入区挂件(替换成你的内容)'}</div>
    )
})
