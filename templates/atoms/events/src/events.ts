// events 原子聚合入口:按勾选的事件域接线,每域一行调用。
// 生成器只保留被勾选域的 import 与调用行;域内监听实现见 ./domains/*.ts。
import type { Context } from '@deepseek-ai/cordis'
import { registerAgentListeners } from './domains/agent.ts'
import { registerApprovalListeners } from './domains/approval.ts'
import { registerFsListeners } from './domains/fs.ts'
import { registerSessionListeners } from './domains/session.ts'
import { registerSettingsListeners } from './domains/settings.ts'
import { registerToolsListeners } from './domains/tools.ts'

/**
 * 注册全部已选事件域的监听。
 * @param ctx - Cordis 上下文
 */
export function registerEventListeners(ctx: Context): void {
    registerToolsListeners(ctx) // 域:tools
    registerAgentListeners(ctx) // 域:agent
    registerSessionListeners(ctx) // 域:session
    registerApprovalListeners(ctx) // 域:approval
    registerFsListeners(ctx) // 域:fs
    registerSettingsListeners(ctx) // 域:settings
}
