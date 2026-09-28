import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-web' // ctx.web 与 provider 类型的来源

/**
 * 缝扩展:注册网络提供者(搜索;抓取用 registerFetchProvider,同款写法)。
 * 每种能力可多个提供者并存,按配置或唯一可用者选择。
 * @param ctx - Cordis 上下文
 */
export function registerWebSeam(ctx: Context): void {
    ctx.web.registerSearchProvider({
        id: '{{PLUGIN_ID}}', // 注册键(配置 searchProvider 时引用它)
        /** 廉价本地可用性检查;禁止网络调用 */
        available(): boolean {
            return true // TODO: 检查你的 API key 等前置条件
        },
        /** 执行一次搜索;尊重 signal 取消 */
        async search(request, signal) {
            // TODO: 调用你的搜索 API;sources = 可引用来源列表
            void signal
            return {
                content: `[{{PLUGIN_ID}} search] received: ${request.query}`,
                sources: [],
                truncated: false,
            }
        },
    })
}
