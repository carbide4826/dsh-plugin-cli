/** CSS Modules 类型声明:.module.css 导入返回类名映射(构建期哈希,社区 UI 插件同款) */
declare module '*.module.css' {
    const classes: Record<string, string>
    export default classes
}
