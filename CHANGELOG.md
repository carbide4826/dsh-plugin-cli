# Changelog

本项目的所有重要变更都记录在此文件中。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

中文 · [English](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.en.md)

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
