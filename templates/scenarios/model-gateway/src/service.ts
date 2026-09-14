import { Context, Service } from '@deepseek-ai/cordis'

/**
 * 自有服务骨架:extends Service + super(ctx, name) 即完成注册,
 * 卸载随所属 fiber 自动清理,无需手动管理生命周期。
 *
 * 供其他插件用 ctx.<服务名> 访问时,放开下面的声明合并并改成你的服务名:
 *
 * declare module '@deepseek-ai/cordis' {
 *     interface Context {
 *         example: ExampleService
 *     }
 * }
 */
export class ExampleService extends Service {
    // TODO: 依赖的服务名(决定加载顺序),如 ['llm']
    static inject: readonly string[] = []

    constructor(ctx: Context) {
        super(ctx, 'model-gateway')
    }

    // TODO: 你的服务能力(公开方法、定时任务、连接管理等)
}
