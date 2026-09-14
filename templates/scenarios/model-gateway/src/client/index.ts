// client 侧聚合入口(由 dshp 生成):每界面位一行调用,实现见 ./surfaces/(注册层 .ts + 组件层 .tsx)。
// renderer/client 是 ctx.slots 的类型来源(官方同款集中引入)。
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context } from '@deepseek-ai/cordis'
import { registerSettingsCard } from "./surfaces/settings-card.ts"

// client 侧服务:槽位注册必需
export const inject = ['slots']

/**
 * 注册已选界面位。
 * @param ctx - client 根上下文
 */
export function apply(ctx: Context): void {
    registerSettingsCard(ctx) // 界面位:设置卡片
}
