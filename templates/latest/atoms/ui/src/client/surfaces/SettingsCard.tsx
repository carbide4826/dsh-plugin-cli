import { memo } from 'react'
import styles from './SettingsCard.module.css'

export const SettingsCard = memo(function SettingsCard() {
    return (
        <div className={styles.card}>{'{{PLUGIN_ID}} · 设置卡片(替换成你的内容)'}</div>
    )
})
