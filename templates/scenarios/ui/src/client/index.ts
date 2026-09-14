// {{PKG_NAME}} — 浏览器半边入口(client 插件)。
// 槽位契约以官方 ui-conversation / ui-slots 文档为准;
// 换槽位时同步调整 inject 声明与组件 props。
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only import:把目标槽位的类型合并进 client 上下文(按你实际挂的槽增减)
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { MyWidget } from './Widget.tsx'

// 本插件需要的 client 侧服务(slots 必需;其余按需追加)
export const inject = ['slots']

/**
 * Client 插件入口:往槽位注册你的组件
 * @param ctx - client 根上下文
 */
export function apply(ctx: ClientContext): void {
  // 示例:往输入区 dock 挂一个条目(官方 GoalBar 同款槽位)。
  // 换槽位:改这里的槽名 + 上方 type-only import + Widget 的 props 契约。
  ctx.slots.inject('conversation.input.dock', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.dock',
        id: '{{PLUGIN_ID}}', // 同一槽位多个条目时的去重标识
        order: 100, // 同槽内的排序(越大越靠后)
        // inject face:槽位渲染时传给组件的业务数据/动作。
        // 返回值结构按目标槽位的契约定义;示例返回空 face。
        inject: () => ({}),
      },
      MyWidget,
    ),
  )
}
