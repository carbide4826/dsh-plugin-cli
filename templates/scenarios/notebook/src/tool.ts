import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { NotebookService } from "./service.ts"

// 工具名:模型靠它点名调用(下划线风格)
export const toolName = 'note'

// 工具入参:action 区分记/查/列(单工具多动作,比拆多个工具更轻)
export interface ToolArgs {
    /** put = 记一条;get = 查一条;list = 列出全部便签名 */
    action: 'put' | 'get' | 'list'
    /** 便签名(action = put/get 时必填) */
    key?: string
    /** 便签正文(action = put 时必填) */
    text?: string
}

// 工具结果
export interface ToolResult {
    /** 给模型看的执行结果描述 */
    result: string
}

/**
 * 注册工具:execute 闭包直接持有 NotebookService 实例(不走 ctx 服务查找)。
 * 原因:ctx.plugin(Service) 会把服务注册进【子作用域】,本插件沿父链查找永远碰不到它,
 * 必报 "cannot get property ... without inject";实例直传是官方姿势(schedule 插件同款)。
 * 改业务逻辑直接改本函数内部。
 */
export function registerTool(ctx: Context, notes: NotebookService): void {
    ctx.tools.register(
        defineTool({
            name: toolName,
            // description 是模型决定是否调用的唯一依据,要写成"什么时候该找我"
            description:
                '用户的便签本:记住(put)、查询(get)或列出(list)用户保存的笔记。当用户说"记一下/帮我记住/我之前记过什么"时调用。',

            // 参数 schema:字段结构 = type / description;required 只接受 true,
            // 可选参数省略 required 键(InferArgs 据此推导 args 类型)
            parameters: {
                action: {
                    type: 'string',
                    required: true,
                    description: '操作类型:put 记录 / get 查询 / list 列出全部',
                },
                key: { type: 'string', description: '便签名(put/get 时必填)' },
                text: { type: 'string', description: '便签正文(put 时必填)' },
            },

            // 结果 schema:对象必须显式 additionalProperties,字段加 required: true
            output: {
                schema: {
                    type: 'object',
                    properties: {
                        result: { type: 'string', required: true, description: '执行结果' },
                    },
                    additionalProperties: false,
                },
                render: (_args, value) => [{ type: 'text', text: value.result }],
            },

            async execute(args: ToolArgs): Promise<ToolResult> {
                if (args.action === 'put') {
                    if (args.key === undefined || args.text === undefined) {
                        return { result: 'put 需要 key 和 text 两个参数。' }
                    }
                    await notes.putNote(args.key, args.text)
                    return { result: `已记下「${args.key}」。` }
                }
                if (args.action === 'get') {
                    if (args.key === undefined) return { result: 'get 需要 key 参数。' }
                    const text = await notes.getNote(args.key)
                    return { result: text === null ? `没有找到「${args.key}」。` : `「${args.key}」:${text}` }
                }
                const keys = await notes.listNotes()
                return { result: keys.length === 0 ? '便签本还是空的。' : `已有便签:${keys.join('、')}` }
            },
        }))
}
