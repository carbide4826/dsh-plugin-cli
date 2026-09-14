import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolRunContext } from '@deepseek-ai/dsh-tools'

// 工具名:模型靠它点名调用(下划线风格;与 client 侧 tool-view 的 key 对应)
export const toolName = 'count_chars'

// 工具入参(与下方 parameters schema 对应,模型按 schema 填参)
export interface ToolArgs {
    /** 要统计的文本 */
    text: string
}

// 工具结果(与下方 output schema 对应)
export interface ToolResult {
    /** 字符数(按 Unicode 码点,emoji 记 1) */
    chars: number
    /** 词数(按空白切分) */
    words: number
    /** 行数 */
    lines: number
}

/** 工具核心逻辑:统计文本的字数/词数/行数(零依赖,替换成你的真实业务即可) */
export async function execute(
    args: ToolArgs,
    _exec: ToolRunContext, // 工具运行上下文(取消信号、进度上报等),不用可忽略
): Promise<ToolResult> {
    const text = args.text
    return {
        chars: [...text].length,
        words: text.split(/\s+/).filter(Boolean).length,
        lines: text === '' ? 0 : text.split('\n').length,
    }
}

/** 注册工具:改上面的 execute 和 schema 即可,这里一般不用动 */
export function registerTool(ctx: Context): void {
    ctx.tools.register(
        defineTool({
            name: toolName,
            // description 是模型决定是否调用的唯一依据,要写成"什么时候该找我"
            description:
                '统计一段文本的字符数、词数与行数。当用户想知道某段文本有多长、字数多少时调用。',

            // 参数 schema:字段结构 = type / required / description
            parameters: {
                text: { type: 'string', required: true, description: '要统计的原文' },
            },

            // 结果 schema:对象必须显式 additionalProperties,字段加 required: true
            output: {
                schema: {
                    type: 'object',
                    properties: {
                        chars: { type: 'number', required: true, description: '字符数' },
                        words: { type: 'number', required: true, description: '词数' },
                        lines: { type: 'number', required: true, description: '行数' },
                    },
                    additionalProperties: false,
                },
                // 无自定义视图时的兜底文本;quick-tool 注册了 tool-view,界面会走 ToolView.tsx
                render: (_args, value) => [
                    { type: 'text', text: `字符 ${value.chars} · 词 ${value.words} · 行 ${value.lines}` },
                ],
            },

            execute,
        }))
}
