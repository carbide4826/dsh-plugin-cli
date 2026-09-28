# create-dsh-plugin-cli

[![npm version](https://img.shields.io/npm/v/create-dsh-plugin-cli.svg)](https://www.npmjs.com/package/create-dsh-plugin-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/create-dsh-plugin-cli.svg)](https://nodejs.org)

中文 · [English](https://github.com/carbide4826/dsh-plugin-cli/blob/main/README.en.md)

交互式脚手架 CLI,一键搭建 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh`)插件项目骨架。

- npm 包名:`create-dsh-plugin-cli`,bin 命令:`dshp`
- 双轨配套:latest 轨配 dsh `0.1.5-rc.3`,next 轨配 dsh `0.1.7-rc.2`;`--target` 选择,默认 latest
  - 注:官方 npm latest 现已是 `0.1.7-rc.2`;本 CLI 的 latest 轨按保守策略**有意延迟**跟进,待 next 轨验证充分后晋升
- Node 要求:`^22.19.0 || >=24.0.0`

> 开发与验证均基于 web(`dsh web`);其他宿主 profile 未经验证,遇到问题欢迎提 [issue](https://github.com/carbide4826/dsh-plugin-cli/issues)。

## 快速开始

```sh
npm create dsh-plugin-cli          # 零安装启动,进入交互式问卷
# 或
npx create-dsh-plugin-cli
```

## 安装 `dshp` 命令

`dshp` 是本包的 bin 命令(npm 安装包时按 `bin` 字段自动创建链接),三种获取方式:

```sh
npm i -g create-dsh-plugin-cli     # 全局安装:之后直接用 dshp 命令(下文均此写法)
npx create-dsh-plugin-cli ...      # 免安装临时跑(等价 npm create dsh-plugin-cli -- ...)
npm i create-dsh-plugin-cli        # 项目内安装:用 npx dshp / pnpm dshp 调用
```

## 系统命令

`dshp` 目前只挂一个子命令 `create`(交互式问卷,或 `--template` 非交互二选一):

```sh
dshp --help              # 主命令总览
dshp create --help       # create 的完整选项与场景/案例一览
```

`dshp create` 支持的选项见下方 [可覆盖参数](#可覆盖参数)。

## 用法

### 交互

```sh
dshp create my-plugin              # 交互式问卷生成插件骨架
```

交互式快照

```text
┌  dshp · DSH 插件骨架生成
│
◆  项目目录 Project directory
│  my-plugin
│
◇  一句话描述(可空,直接回车跳过)
│
◇  作者(可空,直接回车跳过)
│
◆  npm 包名 package name
│  my-plugin
│
◆  插件 id plugin id
│  my-plugin
│
◆  配套哪一代 dsh 宿主?
│  ● latest · dsh 0.1.5-rc.3
│  ○ next · dsh 0.1.7-rc.2
│
◆  从哪里开始?
│
├─ ● 精选案例 ────────┐
│                     ▼
│              ◆ 选择精选案例
│              │ ● quick-tool      ── 查询工具+结果卡片
│              │ ○ model-gateway   ── 自有模型网关+动态设置
│              │ ○ session-bot     ── 会话自动响应
│              │ ○ webhook-bridge  ── 外部事件桥接
│              │ ○ notebook        ── 用户数据存取
│              │
│              └─ 已拷贝 N 个文件 → ./my-plugin
│
└─ ○ 原子组合 ────────┐
                      ▼
              ◆ 这个包的定位是?
              │ ● bundle   ── 随宿主分发的插件包
              │ ○ library  ── 独立发布的库包
              │
              ◆ 勾选插件能力(空格切换,回车确认)
              │ ◻ tool      ── 给模型加可调用工具
              │ ◻ events    ── 拦截和响应:权限门、审计、事件流
              │ ◻ service   ── 新建服务,或者扩展常用能力 seam
              │ ◻ ui        ── 往 web 界面新增面板/卡片
              │ ◻ protocol  ── 把外部程序/协议桥接进 DSH
              │
              ◆ 配置方式?
              │ ● none
              │ ○ static
              │ ○ dynamic
              │
              └─ 已生成 N 个文件 → ./my-plugin
```

### 非交互

精选案例(`-s`,整目录拷贝真实工程):

```sh
dshp create my-notes --template notebook -s --description <text> --author <name>
```

原子组合(按能力勾选拼装):

```sh
dshp create my-llm --template llm --pkg-position library --author <name> --description <text>
```

配套下一代宿主(`--target next`,生成项目按 dsh 0.1.7-rc.2 钉版;latest 轨与交互式生成同样适用):

```sh
dshp create my-gw --template model-gateway -s --target next
```

#### 可覆盖参数

| 参数                        | 取值                          | 未提供时的默认               |
| --------------------------- | ----------------------------- | ---------------------------- |
| `--pkg-name <name>`         | npm 包名                      | 目录名推导(`-s`:跟随插件 id) |
| `--plugin-id <id>`          | 插件 id                       | 目录名推导                   |
| `--tool-name <name>`        | 工具名                        | 场景预设(`example_tool`)     |
| `--description <text>`      | 文本                          | 场景预设文案                 |
| `--author <name>`           | 文本                          | 空                           |
| `--pkg-position <position>` | `bundle` / `library`          | `bundle`                     |
| `--config <mode>`           | `none` / `static` / `dynamic` | 场景预设(ui 场景为 `static`) |
| `--target <track>`          | `latest` / `next`             | `latest`(配套轴:dsh 版本与依赖配套按轨钉定) |

> 精选案例不适用 `--tool-name` / `--pkg-position` / `--config`(生成结构随案例锁定)。

## 生成之后

```sh
cd my-plugin
pnpm install                      # ① 安装依赖(项目根自带 pnpm-workspace.yaml 做 workspace 定界,正常安装即可)
pnpm approve-builds               # ② 供应链保护拦截构建脚本:放行 node-pty / koffi / @deepseek-ai/dsh-subprocess-local(@google/genai / protobufjs 是 no-op 不用批),放行后再 install 一次让脚本真正执行
pnpm add -D @deepseek-ai/dsh@0.1.5-rc.3   # ③ 安装 dsh 宿主(latest 轨配 0.1.5-rc.3,next 轨配 0.1.7-rc.2,与 --target 对应;裸 latest tag 可能是其他线,别裸装;装完同样 approve-builds 放行)
pnpm build                        # ④ 构建
pnpm dsh web --patch ./dev.patch.yml      # ⑤ 启动 dsh 宿主(直载源码调试)
```

生成项目结构(随能力勾选增减;问卷里填的值落在哪都标在里面):

```text
my-plugin/                  ← 项目目录 = 你填的目录名
├─ package.json             name = 你填的 npm 包名;描述/作者也在
├─ src/index.ts             插件入口(export const name = 你填的插件 id;inject/apply)
├─ src/tool.ts              工具实现(勾选 tool 时)
├─ src/domains/             事件域监听(勾选 events 时)
├─ src/client/surfaces/     界面位卡片(勾选 ui 时;调试须 build + plugin add 轨道)
├─ cordis.patch.yml         分发配置层(id = 插件 id;plugin add 后生效)
├─ dev.patch.yml            本地调试 overlay(--patch 直载,不入库)
└─ README.md                项目内完整说明(装 dsh / 放行脚本 / 调试全流程)
```

> dsh 即 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)——模型、工具与会话的本地运行时,首页含文档与源码入口。
>
> 宿主命令行参数可多可杂?`docs/dsh-command-builder.html` 是可视化组装器:浏览器直接打开,点选、增删 flag,拼出完整命令后复制运行。

## 版本说明

**轨道与配套**(生成时以 `--target` 选择,默认 latest;npm 官方 latest 现已是 `0.1.7-rc.2`,本 CLI 的 latest 轨按保守策略有意延迟跟进):

| 轨道 | dsh 宿主 | 关键配套(cordis / schemastery) |
| --- | --- | --- |
| `latest` | `0.1.5-rc.3` | `4.0.2` / `3.18.2` |
| `next` | `0.1.7-rc.2` | `~4.0.4` / `~3.18.4` |

依赖与宿主版本精确配套;混用不配套的组合可能在安装树中产生双实例,导致类型声明合并冲突、typecheck 失败。

**宿主对插件的版本门控**:dsh 在安装与加载插件时,会校验插件 `peerDependencies` 中所有 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-*` 声明(其余依赖不参与),与运行中的 dsh 版本不满足即**拒绝安装**并提示 incompatible。因此 latest 轨产物装不进 0.1.7 宿主,反之亦然——请保持产物轨道与宿主版本一致。确需跨版本强装,可用官方豁免命令(安装被拒时终端会给出完整命令):

```sh
dsh plugin --profile web allow-version <插件名>@<插件版本> --dsh-version <宿主版本> --accept-risk
```

> 豁免仅表示明确接受风险,跨轨产物的功能不保证。

**插件展示信息**:宿主插件管理页的名称 / 介绍 / 图标来自插件包的 `locale/<语言>.json`(`meta.title` / `meta.description`,按宿主界面语言选择,英文兜底)与 `package.json` 的 `icon` 字段;本项目模板已默认携带,改文案编辑 `locale/zh.json` 即可。

## 版本变更日志

各版本的完整变更内容见 [CHANGELOG.md](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.md)(英文版:[CHANGELOG.en.md](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.en.md))。

## 后续规划

- 随 dsh 版本调整持续更新适配 —— 版本统一管理,升级跟随官方版本线 ✅
- `--template` 自定义模板源:支持 local path / git URL / npm 包
- 本地化(多语言支持)—— 0.1.1 已交付:`--lang zh|en` 双语界面,生成项目 README 按语言单份交付 ✅
- 支持 agent 工具识别与调用,规划做成 skill 或 MCP 形态
- 双轨模板(0.1.5):latest / next 两套模板各配一代宿主(`--target` 选择);依赖精确钉官方元包配套版本;生成项目自带插件图标与双语清单元信息 ✅

## License

[MIT](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
