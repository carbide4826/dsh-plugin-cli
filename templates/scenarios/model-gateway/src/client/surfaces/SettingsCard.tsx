// 设置卡片:设置页 → 插件 → model-gateway 区块内渲染的卡片。
// 插件的 Config schema(apiKey/baseUrl/model)会由宿主在卡片旁自动渲染成表单,
// 这里放一段说明文字即可;要自定义表单/状态展示时再扩展本组件。
import { memo } from 'react'

export const SettingsCard = memo(function SettingsCard() {
    return (
        <div style={{ padding: '4px 8px', fontSize: 12, lineHeight: 1.6, opacity: 0.8 }}>
            {'自有模型网关:填写 apiKey 后,在模型选择器选择 gateway 模型即可对话(配置变更实时生效)。'}
        </div>
    )
})
