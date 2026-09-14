import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";

// 工具名:模型用它调用本工具(下划线风格)
export const toolName = "{{TOOL_NAME}}";

// 工具入参:模型的 JSON 参数会先按 parameters schema 校验,再传给 execute
export interface ExampleArgs {
    text: string;
}

export interface ExampleResult {
    chars: number;
    words: number;
    lines: number;
}

/** 工具核心逻辑:替换成你的业务 */
export async function execute(args: ExampleArgs): Promise<ExampleResult> {
    const words = args.text.split(/\s+/).filter(Boolean).length; // TODO: 你的业务逻辑
    return {
        chars: args.text.length,
        words,
        lines: args.text.split("\n").length,
    };
}

/** 注册工具:一般不用改,改上面的 execute 和 schema 即可 */
export function registerTool(ctx: Context): void {
    ctx.tools.register(
        defineTool({
            name: toolName,
            description:
                "Count characters, words and lines of the given text (example tool).", // TODO: 描述你的工具,模型靠它决定何时调用

            parameters: {
                text: {
                    type: "string",
                    required: true,
                    description: "The text to analyze.",
                },
            },

            // 注意:对象 schema 必须显式 additionalProperties: false,
            // 字段标 required: true 才能让 render 的 value 类型完整
            output: {
                schema: {
                    type: "object",
                    properties: {
                        chars: {
                            type: "integer",
                            required: true,
                            description: "Total characters.",
                        },
                        words: {
                            type: "integer",
                            required: true,
                            description: "Word count.",
                        },
                        lines: {
                            type: "integer",
                            required: true,
                            description: "Line count.",
                        },
                    },
                    additionalProperties: false,
                },
                render: (_args: ExampleArgs, value: ExampleResult) => [
                    {
                        type: "text",
                        text: `${value.chars} chars / ${value.words} words / ${value.lines} lines`,
                    },
                ],
            },

            execute,
        }),
    );
}
