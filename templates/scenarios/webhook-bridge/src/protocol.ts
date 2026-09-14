import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent' // ctx.agents 的类型来源
import { brandString } from '@deepseek-ai/dsh-brand'
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'

/**
 * 协议桥:HTTP webhook 入口(参考官方 dsh-webhook 包的对接方式)。
 * 外部系统 POST /hook {"text": "..."} → 每次投递建一个 agent 跑一轮。
 * 监听端口是自有资源,包 ctx.effect:插件卸载时自动关停。
 * TODO: 按你的协议补鉴权、重试、会话复用等。
 * @param ctx - Cordis 上下文
 * @param port - 监听端口(来自插件 Config)
 */
export function registerProtocol(ctx: Context, port: number): void {
    const server = createServer((req, res) => {
        void handle(req, res)
    })

    ctx.effect(() => {
        server.listen(port)
        console.log(`[webhook-bridge] webhook listening on :${port}`)
        return () => {
            server.close()
            console.log(`[webhook-bridge] webhook server closed`)
        }
    }, 'webhook-bridge: webhook server')

    /** 一次投递:读 body → 建 agent → followup → 应答 */
    async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
        try {
            if (req.method !== 'POST' || req.url !== '/hook') {
                res.statusCode = 404
                res.end()
                return
            }
            const text = await readBody(req)
            // agentOptions 不填时用默认模型;要指定则传 { provider: '...', model: '...' }
            const handleAgent = await ctx.agents.create({
                sessionId: brandString<SessionId>(`webhook-bridge-${randomUUID()}`),
            })
            // followup 排队一轮新对话;steer/send 用于插话,详见 AgentHandle 类型
            handleAgent.agent.followup(
                createUserMessage({
                    content: [{ type: 'text', text }],
                    source: {
                        kind: 'plugin',
                        plugin: 'webhook-bridge',
                        form: 'notice',
                        summary: boundContextSummary(text), // 摘要超 120 字符自动截断
                    },
                }),
            )
            res.statusCode = 202
            res.end('{"accepted":true}')
        } catch (error) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(error) }))
        }
    }
}

/** 读取并解析 JSON body(宽松:非 JSON 按纯文本处理) */
async function readBody(req: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8')
    try {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && 'text' in parsed) {
            return String((parsed as { text: unknown }).text)
        }
    } catch {
        // 非 JSON:按纯文本投递
    }
    return raw
}
