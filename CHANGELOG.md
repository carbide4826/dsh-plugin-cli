# Changelog

本项目的所有重要变更都记录在此文件中。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

中文 · [English](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.en.md)

## [0.1.5] - 未发布

### 新增

- 双轨模板架构:内置 latest(配套 dsh 0.1.5-rc.3)与 next(配套 dsh 0.1.7-rc.2)两套模板;`dshp create --target next` 生成配套下一代宿主的插件,交互式生成会询问目标轴(默认 latest)。
- next 轨适配 dsh 0.1.7:设置页插件入口由 keyed 卡片迁移为 Plugins 页签(`settings.plugins.tab`);插件配置改由宿主原生配置表单承担(0.1.7 已移除 `installSection`),配置字段标记 volatile 即可进入表单、保存即热更新。
- 插件清单详情页信息:模板自带专属图标(`icon.svg`)与双语元信息(`locale/{zh,en}.json` 的标题与描述),宿主按界面语言显示、英文兜底;预设与全部精选案例默认携带。
- 消息来源 kind:0.1.7 移除共享 `plugin` kind,模板改为声明自有 `plugin-notice`(protocol 原子 / session-bot / webhook-bridge)。

### 变更

- cordis 与 schemastery 依赖精确钉死为官方元包配套版本,浮动版本范围会在安装树里产生双实例,导致类型声明合并劈叉、生成项目 typecheck 失败。
- latest 轨跟进 dsh 0.1.5-rc.3,并撤销 0.1.3 引入的 loader/hmr/timer 版本锁定(rc.3 元包已自行精确钉版,规避手段到期移除)。

## [0.1.4] - 2026-09-24

### 其他

- README 后续规划中 cordis 版本锁定的已知问题条目更新为「已规避」,与 0.1.3 的实际修复对齐。

## [0.1.3] - 2026-09-24

### 修复

- 修复 quick-tool 案例模板的类型问题,生成项目 typecheck 不再报错。
- 修复 pnpm 安装后 `pnpm dsh web` 启动即崩的问题:官方 2026-09-22 发布的 cordis-plugin-loader 1.0.5 与 dsh 0.1.5-rc.2 不兼容(HMR 服务静默装载失败)。生成项目现自带 `pnpm-workspace.yaml` 锁定配套的 loader/hmr/timer 版本规避。后续动作:跳过 rc.3,待官方 0.1.7 线稳定后整树同步升级。

## [0.1.2] - 2026-09-22

### 修复

- README 中英互链与 License 链接在 npm 预览页失效的问题。

### 其他

- 内部工程改进(CI、发版流程、模板版本统一管理);行为无变化。

## [0.1.1] - 2026-09-22

### 新增

- 本地化:`--lang zh|en` 双语界面(缺省自动检测 `LANG`),终端问卷/提示/报错/`--help` 全量跟随语言。
- 生成项目 README 按语言单份交付(`--lang en` 交付英文 README);仓库根 README / CHANGELOG 双语两份。

## [0.1.0] - 2026-09-19

首发版本。
