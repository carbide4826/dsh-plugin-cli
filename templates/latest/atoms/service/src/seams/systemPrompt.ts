import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt' // ctx.systemPrompt 的类型来源

/**
 * 缝扩展:往系统提示注册 section(记忆/知识库/指令注入)。
 * section 注册即 effect:插件卸载自动移除;同名 scoped section 会遮蔽全局。
 * @param ctx - Cordis 上下文
 */
export function registerSystemPromptSeam(ctx: Context): void {
    ctx.systemPrompt.section({
        name: '{{PLUGIN_ID}}:notes', // 段名(同层去重键)
        order: 100, // 排序(越大越靠后)
        text: 'TODO: 你的持久指令/知识内容', // TODO: 换成你的内容来源
    })
}
