import type { Context } from '@deepseek-ai/cordis'
import { registerStorageSeam } from "./storage.ts"

/**
 * 注册已选能力缝。
 * @param ctx - Cordis 上下文
 */
export function registerServiceSeams(ctx: Context): void {
    registerStorageSeam(ctx) // 缝:持久存储(storage)
}
