// notebook — 插件入口(由 dshp 按勾选拼装生成)。
import type { Context } from '@deepseek-ai/cordis'
import { registerTool } from "./tool.ts"
import { NotebookService } from "./service.ts"
import { registerServiceSeams } from "./seams/index.ts"

// 插件名:Cordis 注册名(loader 诊断与其他插件引用用)
export const name = 'notebook'

// 要求就绪的服务(决定加载顺序)
export const inject = ['tools', 'storage']

/**
 * 插件入口:各原子的注册调用(由 dshp 按勾选拼装)。
 * @param ctx - Cordis 上下文
 */
export function apply(ctx: Context): void {
    registerServiceSeams(ctx)
    // 直接实例化(而非 ctx.plugin):ctx.plugin 会开子作用域,服务注册进去后本插件沿父链
    // 查不到(报 without inject);new 则注册进当前作用域,且实例直接交给工具闭包持有。
    // ⚠️ 变量名避开案例名(notebook 会被身份重写换成带连字符的项目名,落在变量名位置即语法错)
    const notes = new NotebookService(ctx)
    registerTool(ctx, notes)
}
