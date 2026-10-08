# Changelog

本项目的所有重要变更都记录在此文件中。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

中文 · [English](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.en.md)

## [0.1.9] - 2026-10-08

### 新增

- 界面位依赖护栏:勾选界面位时校验其依赖原子——要 `tool-view` 却没勾 `tool` 会在问卷里报错并重问,不再生成注册键为空的哑界面。
- 占位符漂移护栏:模板素材里的占位符在变量表里取不到值时,生成当场报错并列出「文件 · 键」,不再把残留的花括号落进生成项目。

### 变更

- 精选案例素材的 package.json 补进包白名单 `files`(`dist` / `icon.svg` / `locale` / `cordis.patch.yml`),与预设管线的产出同值;此前没有该字段,npm 会回落到 `.gitignore` 黑名单,发布物有缺 `dist` 的风险。
- 交互问卷的「目标轨」一步把 `--target` 作为初值:显式给了 `--target next` 再回车即锁定 next,不再静默回落 latest。
- 交互路径「目录已存在」的退出码由 0 改为 1,与非交互路径一致;用户主动中止仍为 0。
- quick-tool 案例结果卡片标题里的工具名改由宿主 props 提供,案例内工具名收敛到 `src/tool.ts` 一处定义。
- protocol 原子的端口注释改为面向插件作者的改造提示(想让端口可配置就声明 `Config` 字段并从配置读端口)。

### 修复

- canary 前瞻:修掉探针里 Node 片段的语法错误(该步骤此前每轮必然中止),并在 manifest 版本号或 npm `dist-tags.latest` 取空时立即失败,不再让空串流进后续替换。
- 依赖清单核对补齐 `@deepseek-ai/dsh-client-ui-settings`(模板槽型引用的转手包),已知宿主包集合覆盖到真实引用面。

### 其他

- publish 工作流移除未使用的 `id-token` 权限(发布走仓库密钥 `NPM_TOKEN` 认证,未启用 provenance)。

## [0.1.8] - 2026-10-07

### 变更

- latest 轨追平 dsh `0.2.0-rc.2`,与 next 轨同版;模板依赖与案例素材的配套版本随之统一。
- 动态配置的入口仍按轨分叉生成(latest / next 两臂),两臂当前产出一致。

### 修复

- 动态配置的入口不再生成宿主已移除的 `ctx.settings.installSection` 接线,也不再声明 `settings` 就绪与 `@deepseek-ai/dsh-settings` peer。
- `settings` 事件域的 peer 清单移除上游已删除的 `@deepseek-ai/dsh-settings-file`(生成项目安装依赖时报 404)。
- `settings` 事件域原子的监听事件名改为宿主声明的 `settings/document-updated`(原 `settings/updated` 宿主未声明,生成的项目 typecheck 失败)。
- 事件域清单只列宿主实存事件:`agent/session-start` 更正为 `agent/created` + `agent/disposed`,`settings/updated` 移除。

## [0.1.7] - 2026-09-30

### 变更

- 双轨晋升:latest 轨对齐 dsh `0.1.7-rc.2`(原 next 树转正),next 轨对齐 dsh `0.2.0-rc.2`;两轨的 settings 卡片均为「插件页签」形态,cordis / schemastery 配套两轨相同(`~4.0.4` / `~3.18.4`)。

### 修复

- 修复 `ui` 预设生成的项目 typecheck 报错(TS2322):配置示例的 volatile 字段与保留的 `z<Config>` 类型注解冲突,已移除该注解。

## [0.1.6] - 2026-09-29

### 其他

- 发布改为 GitHub Actions 自动发布:推送 `v*` tag 自动构建并发包(仓库密钥配置 `NPM_TOKEN` 鉴权);package.json 补充仓库地址。

## [0.1.5] - 2026-09-29

### 新增

- 双轨模板架构:内置 latest(配套 dsh 0.1.5-rc.3)与 next(配套 dsh 0.1.7-rc.2)两套模板;`dshp create --target next` 生成配套下一代宿主的插件,交互式生成会询问目标轴(默认 latest)。
- next 轨适配 dsh 0.1.7:设置页插件入口由 keyed 卡片迁移为 Plugins 页签(`settings.plugins.tab`);插件配置改由宿主原生配置表单承担(0.1.7 已移除 `installSection`),配置字段标记 volatile 即可进入表单、保存即热更新;插件管理页(侧栏「插件」)中插件组件行出现「配置」入口,页内表单直接编辑配置(模型网关案例已带,样式与宿主原生表单一致)。
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
