// 设置卡片:设置页 → 插件 → 插件配置列表里本插件的卡片。
// ⚠️ 实测(0.1.5-rc.2):宿主不会为第三方卡片自动渲染 Config 表单,也不会包「展开设置」壳——
// 本组件渲染什么,设置页就显示什么(官方卡片如「终端」的表单是它自己包的 controller 画的)。
// 配置的查看/修改入口:echo 回复、cordis.patch.yml 的 config 行;要在卡片上编辑需自行实现。
// 标题必须有:列表里没有标题的卡片是一行小字,用户认不出来。
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
