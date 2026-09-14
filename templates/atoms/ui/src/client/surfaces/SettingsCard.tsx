// TODO: 替换成你的设置卡片(表单、开关、状态展示……)
import { memo } from 'react'

export const SettingsCard = memo(function SettingsCard() {
    return (
        <div style={{ padding: '4px 8px', fontSize: 12, opacity: 0.8 }}>
            {'{{PLUGIN_ID}} settings'}
        </div>
    )
})
