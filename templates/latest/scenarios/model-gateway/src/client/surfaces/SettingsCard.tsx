import { memo } from 'react'
import styles from './SettingsCard.module.css'

export const SettingsCard = memo(function SettingsCard() {
    return (
        <div className={styles.card}>
            <div className={styles.title}>自有模型网关</div>
            <div className={styles.desc}>
                {'配置存放 key 的环境变量名(默认 GATEWAY_API_KEY),模型选择器选 gateway 模型即可对话(配置变更实时生效)。'}
            </div>
        </div>
    )
})
