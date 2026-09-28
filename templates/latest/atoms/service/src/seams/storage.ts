import type { Context } from '@deepseek-ai/cordis'
import type { KvUnit, KvUnitDescriptor, StorageBackend } from '@deepseek-ai/dsh-storage'

/**
 * 缝扩展:注册持久存储后端(供 storage 域表单使用;官方 json/sqlite 同款路径)。
 * 下面的最小实现 = 内存 KV 后端(生成即可运行,进程退出即失)。
 * 换真实介质(文件/SQLite)时把 store 的读写替换成你的介质操作即可。
 * @param ctx - Cordis 上下文
 */
export function registerStorageSeam(ctx: Context): void {
    const backend: StorageBackend = {
        kv: {
            /** 打开(或创建)一个单元 */
            async open(descriptor: KvUnitDescriptor): Promise<KvUnit> {
                return openInMemoryUnit(descriptor)
            },
        },
        /** 排空在途写入并释放介质;幂等 */
        async close(): Promise<void> {
            for (const unit of units.values()) await unit.close()
            units.clear()
        },
    }
    ctx.storage.backend.register('{{PLUGIN_ID}}', backend) // 后端名(部署配置以此选择)
}

// ---- 内存介质:单元名 → 已打开单元 ----
const units = new Map<string, ReturnType<typeof openInMemoryUnit>>()

function openInMemoryUnit(descriptor: KvUnitDescriptor) {
    if (units.has(descriptor.name)) {
        throw new Error(`unit '${descriptor.name}' is already open`)
    }
    // store = 表名 → (记录键 → 记录);global = 单例槽
    const store = new Map<string, Map<string, unknown>>()
    let global: unknown = null
    const unit: KvUnit = {
        async loadAll() {
            const tables: Record<string, Record<string, unknown>> = {}
            for (const [name, records] of store) {
                tables[name] = Object.fromEntries(records)
            }
            return { tables, global }
        },
        async putRecord(table, key, value) {
            let records = store.get(table)
            if (records === undefined) {
                records = new Map()
                store.set(table, records)
            }
            records.set(key, value)
        },
        async deleteRecord(table, key) {
            store.get(table)?.delete(key)
        },
        async setGlobal(value) {
            global = value // 仅当 descriptor.hasGlobal 时合法
        },
        async close() {
            units.delete(descriptor.name)
        },
    }
    units.set(descriptor.name, unit)
    return unit
}
