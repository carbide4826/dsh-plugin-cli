import type { Context } from '@deepseek-ai/cordis'
import type { Session } from '@deepseek-ai/dsh-session' // 事件与会话类型来源
import { sendBotReply } from "../service.ts"

// 自动回复的触发词:用户消息以它开头时,bot 回一条响应
const TRIGGER = '/bot'

/** 从消息 content 里提取纯文本(defensive:内容块形状跨版本可能扩展) */
function messageText(data: unknown): string {
    const content = (data as { content?: readonly unknown[] }).content
    if (!Array.isArray(content)) return ''
    const parts: string[] = []
    for (const block of content) {
        if (block !== null && typeof block === 'object' && 'text' in block) {
            parts.push(String((block as { text: unknown }).text))
        }
    }
    return parts.join(' ')
}

/**
 * session 域监听:会话事件驱动 bot(代表事件:2 个 emit)。
 * @param ctx - Cordis 上下文
 */
export function registerSessionListeners(ctx: Context): void {
    // emit:会话创建并公布
    ctx.on('session/created', (session) => {
        console.log(`[session-bot] session created: ${session.id}`)
    }, { global: true })

    // emit:会话日志追加(post-commit;监听器失败被 containment,不影响提交)
    ctx.on('session/event', (session, event) => {
        if (event.type !== 'user/message') return // 只关心用户消息
        const text = messageText(event.data)
        if (!text.startsWith(TRIGGER)) return // 触发词不开头就忽略

        const reply = `[session-bot] 收到指令:${text.slice(TRIGGER.length).trim() || '(空)'} — 这是插件的自动回复。`
        // 直接落一条 surface 事件;⚠️ global 回调里不要读 ctx.<服务属性>,
        // cordis 的 inject 检查会拦截并抛错
        sendBotReply(session, reply)
    }, { global: true })
}
