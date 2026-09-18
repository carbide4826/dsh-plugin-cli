import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context } from '@deepseek-ai/cordis'
import { registerToolView } from "./surfaces/tool-view.ts"

// client 侧服务:槽位注册必需
export const inject = ['slots']

/**
 * 注册已选界面位。
 * @param ctx - client 根上下文
 */
export function apply(ctx: Context): void {
    registerToolView(ctx) // 界面位:工具调用视图
}
