import { Context, Service } from '@deepseek-ai/cordis'
import type { KvUnit } from '@deepseek-ai/dsh-storage'

/** 单元的形状声明:一张 notes 表,键 = 便签名,值 = 正文 */
interface NotesUnit {
    notes: Record<string, string>
}

/**
 * 笔记服务:封装 storage 缝的 KvUnit,向上提供 put/get/list 三个能力。
 * 卸载随所属 fiber 自动清理,无需手动管理生命周期。
 *
 * 其他插件要用本服务时,放开下面的声明合并(本案例已在下方放开,供工具使用):
 */
export class NotebookService extends Service {
    // 存储能力来自宿主 storage 服务(决定加载顺序)
    static inject: readonly string[] = ['storage']

    private unitPromise?: Promise<KvUnit>

    constructor(ctx: Context) {
        super(ctx, 'notebook')
    }

    /** 打开(或复用)notes 单元;懒初始化,首次使用时才触碰介质 */
    private unit(): Promise<KvUnit> {
        this.unitPromise ??= this.openUnit()
        return this.unitPromise
    }

    private openUnit(): Promise<KvUnit> {
        const backend = this.ctx.storage.backend.get('notebook') // seams/storage.ts 注册的后端名
        if (backend.kv === undefined) {
            return Promise.reject(new Error('notebook 后端未提供 kv 能力'))
        }
        return backend.kv.open({ name: 'notes', version: 1, tables: ['notes'], hasGlobal: false })
    }

    /** 写入(或覆盖)一条便签 */
    async putNote(key: string, text: string): Promise<void> {
        const unit = await this.unit()
        await unit.putRecord('notes', key, text)
    }

    /** 读取一条便签;不存在返回 null */
    async getNote(key: string): Promise<string | null> {
        const all = await (await this.unit()).loadAll()
        const table = (all.tables as Partial<NotesUnit>).notes
        const value = table?.[key]
        return typeof value === 'string' ? value : null
    }

    /** 列出全部便签名 */
    async listNotes(): Promise<string[]> {
        const all = await (await this.unit()).loadAll()
        return Object.keys((all.tables as Partial<NotesUnit>).notes ?? {}).sort()
    }
}

// 声明合并:让工具等处能用 ctx.notebook 访问本服务
declare module '@deepseek-ai/cordis' {
    interface Context {
        notebook: NotebookService
    }
}
