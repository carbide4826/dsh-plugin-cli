// client 侧聚合入口:按勾选的界面位接线,每位一行调用。
// 生成器只保留被勾选界面位的 import 与调用行;实现见 ./surfaces/(注册层 .ts + 组件层 .tsx)。
// renderer/client 是 ctx.slots 的类型来源(官方同款集中引入,一次即可)。
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context } from '@deepseek-ai/cordis'
import { registerChatNode } from './surfaces/chat-node.ts'
import { registerInputDock } from './surfaces/input-dock.ts'
import { registerSessionHeader } from './surfaces/session-header.ts'
import { registerSettingsCard } from './surfaces/settings-card.ts'
import { registerSidebarPanel } from './surfaces/sidebar-panel.ts'
import { registerToolView } from './surfaces/tool-view.ts'

// client 侧服务:槽位注册必需(slots);其余按需追加
export const inject = ['slots']

/**
 * 注册全部已选界面位。
 * @param ctx - client 根上下文
 */
export function apply(ctx: Context): void {
    registerSettingsCard(ctx) // 界面位:设置卡片
    registerChatNode(ctx) // 界面位:会话节点
    registerInputDock(ctx) // 界面位:输入区 dock
    registerSidebarPanel(ctx) // 界面位:侧边栏
    registerToolView(ctx) // 界面位:工具调用视图
    registerSessionHeader(ctx) // 界面位:会话头
}
