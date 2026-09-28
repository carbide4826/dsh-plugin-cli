import { memo, useState } from 'react'
import styles from './SettingsCard.module.css'

/**
 * 插件管理页「行配置」表单(plugins.row.config 槽)。
 * 宿主传入的 form 携带当前配置快照(value/revision/writable)与 mutate 写入;
 * 字段与 src/index.ts 的 Config 一一对应,保存走路径 set 操作、宿主热应用。
 */

/** form prop 的结构化类型(对齐宿主 ConfigPageForm,避免运行时依赖插件管理包)。 */
interface RowConfigFormProps {
    view: 'summary' | 'page'
    form?: {
        state: {
            status: 'loading' | 'ready' | 'unavailable'
            value: Record<string, unknown> | undefined
            revision: number | undefined
            writable: boolean
        }
        mutate: (ops: ReadonlyArray<{ op: 'set'; path: readonly string[]; value: unknown }>, revision?: number) => Promise<void>
    }
}

const FIELDS = [
    { key: 'apiKeyEnv', label: 'API Key 环境变量名' },
    { key: 'baseUrl', label: '网关 Base URL' },
    { key: 'model', label: '模型名' },
] as const

export const RowConfigForm = memo(function RowConfigForm({ view, form }: RowConfigFormProps) {
    const [draft, setDraft] = useState<Record<string, string> | undefined>(undefined)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // 摘要视图:行描述已有文案,此处不再重复输出
    if (view === 'summary') return null

    const snapshot = form?.state
    if (!form || snapshot === undefined || snapshot.status !== 'ready') {
        return <div className={styles.card}>配置加载中…</div>
    }
    if (!snapshot.writable) {
        return <div className={styles.card}>当前宿主不接受配置写入(只读模式)。</div>
    }

    const current = snapshot.value ?? {}
    const values = draft ?? mapStrings(current)
    const dirty = FIELDS.some((f) => (values[f.key] ?? '') !== String(current[f.key] ?? ''))

    const save = async (): Promise<void> => {
        setSaving(true)
        setMessage('')
        try {
            await form.mutate(
                FIELDS.filter((f) => values[f.key] !== undefined).map((f) => ({
                    op: 'set' as const,
                    path: [f.key],
                    value: values[f.key],
                })),
                snapshot.revision,
            )
            setDraft(undefined) // 回读宿主接受的值
            setMessage('已保存,配置热更新生效。')
        } catch (error) {
            setMessage(`保存失败:${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.card}>
            {FIELDS.map((f) => (
                <label className={styles.field} key={f.key}>
                    <span className={styles.fieldLabel}>{f.label}</span>
                    <input
                        className={styles.input}
                        value={values[f.key] ?? ''}
                        onChange={(e) => setDraft({ ...values, [f.key]: e.target.value })}
                    />
                </label>
            ))}
            <button className={styles.save} disabled={!dirty || saving} onClick={() => { void save() }}>
                {saving ? '保存中…' : '保存'}
            </button>
            {message !== '' && <div className={styles.message}>{message}</div>}
        </div>
    )
})

/** 宿主快照里的配置段 → 字符串草稿(非字符串值原样转字符串显示)。 */
function mapStrings(value: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, String(v)]))
}
