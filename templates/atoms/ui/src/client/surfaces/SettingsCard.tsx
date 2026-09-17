// TODO: 替换成你的设置卡片(表单、开关、状态展示……)
import { memo } from 'react'
import styles from './SettingsCard.module.css'

export const SettingsCard = memo(function SettingsCard() {
    return (
        <div className={styles.card}>{'{{PLUGIN_ID}} settings'}</div>
    )
})
