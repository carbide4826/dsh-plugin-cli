// 事件域聚合入口(由 dshp 生成):每域一行调用,实现见 ./domains/*.ts。
import type { Context } from '@deepseek-ai/cordis'
import { registerSessionListeners } from "./domains/session.ts"

/**
 * 注册已选事件域的监听。
 * @param ctx - Cordis 上下文
 */
export function registerEventListeners(ctx: Context): void {
    registerSessionListeners(ctx) // 域:会话事件流
}
