import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-commands' // ctx.commands 的类型来源

/**
 * 缝扩展:注册人类 slash 命令(/xxx,人类触发,不走模型)。
 * 命令名 = 小写字母开头的 [a-z0-9_-](不带斜杠);注册即 effect,卸载自动移除。
 * @param ctx - Cordis 上下文
 */
export function registerCommandsSeam(ctx: Context): void {
    ctx.commands.register({
        name: '{{PLUGIN_ID}}', // TODO: 换成短命令名(如 'notes')
        description: 'TODO: 命令说明(发现 UI 展示)',
        /** handler 直接对目标 agent 执行,不发送给模型 */
        async handler(invocation) {
            // invocation.agent = 接收命令的 agent;invocation.rawInput = 斜杠后的原文
            void invocation
            return { kind: 'success', text: 'TODO: 命令结果' }
            // 失败时返回 { kind: 'error', text: '原因' }
        },
    })
}
