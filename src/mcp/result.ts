// MCP tool 的返回值封装:统一成「JSON 文本 + 失败标记」。
//
// 为什么不用本地化句子当返回值:模型要按稳定字段分支(重试?改参数?),
// 句子随语言变、随文案改,不能当接口。故每条失败都带稳定 code(LOCALE_KEY 映射的那个),
// 句子只作为给人看的补充。
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DshpError, isDshpError } from "../core/errors";
import { renderError } from "../locales";

/** 成功结果:payload 会被 JSON 序列化后作为文本内容返回 */
export function okResult(payload: unknown): CallToolResult {
    return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
}

/**
 * 失败结果:领域错误带稳定 code 与插值参数;非领域异常(真 bug)归为 INTERNAL_ERROR。
 * isError 让宿主把这次调用标成失败,模型不会把错误当成功结果继续用。
 */
export function errResult(err: unknown): CallToolResult {
    if (isDshpError(err)) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(
                        {
                            ok: false,
                            code: err.code,
                            params: err.params,
                            message: renderError(err),
                        },
                        null,
                        2,
                    ),
                },
            ],
            isError: true,
        };
    }
    const message = err instanceof Error ? err.message : String(err);
    const internal = new DshpError("INTERNAL_ERROR", { message });
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(
                    {
                        ok: false,
                        code: internal.code,
                        params: internal.params,
                        message: renderError(internal),
                    },
                    null,
                    2,
                ),
            },
        ],
        isError: true,
    };
}
