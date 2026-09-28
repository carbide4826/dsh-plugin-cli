import { memo } from 'react'
import styles from './InputDock.module.css'

export const InputDock = memo(function InputDock() {
    return (
        <div className={styles.dock}>{'{{PLUGIN_ID}} dock'}</div>
    )
})
