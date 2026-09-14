// {{PKG_NAME}} — host 半边(空壳)。
// 纯 UI 插件的 apply 为空:它的作用只是让插件出现在 host 的
// cordis.yml / Loader 中;真正的界面在 src/client/(经 package.json
// 的 dsh.client 声明被 Web Client 发现并加载)。
// 若你的插件同时有 host 侧行为(工具、事件),在这里正常写。

/** Host 侧入口:纯 UI 插件保持空实现 */
export function apply(): void {}
