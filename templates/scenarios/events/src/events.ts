import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools' // 事件类型来源:引入后 ctx.on 的事件名与参数才有类型提示

/**
 * 事件监听示例(以工具事件为例):
 * - waterfall 模式(如 tools/pre-execute):拿到 next(),不拦截就 `return next()`,
 *   要拦截就返回 deny;多个监听器依次接力。
 * - emit 模式(如 tools/result):没有 next,纯观察,返回值无效。
 *
 * 完整事件矩阵(68 个事件 + 各自的 mode):官方 event-producer-consumer 文档。
 * 监听其他域(agent/session/approval/fs/settings)换事件名即可,写法相同。
 * @param ctx - Cordis 上下文
 */
export function registerEventListeners(ctx: Context): void {
    // 权限门:每次工具派发前调用;不拦截就透传 next()
    ctx.on('tools/pre-execute', async (exec, next) => {
        // exec.name / exec.arguments 是工具名与已解析入参;TODO: 你的拦截逻辑
        if (exec.name === 'example_tool') {
            return { kind: 'deny', reason: 'blocked by {{PLUGIN_ID}}' } // TODO: 拦截示例,按需删除
        }
        return next() // 放行:交给下一个监听器或工具本体
    })

    // 观察:工具跑完后的最终结果(只读快照,失败也照常送达)
    ctx.on('tools/result', (exec, result) => {
        // TODO: 审计、统计等;这里仅示例取值
        console.log(`tool ${exec.name} finished`)
        void result
    })
}
