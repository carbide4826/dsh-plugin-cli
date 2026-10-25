# create-dsh-plugin-cli

[![npm version](https://img.shields.io/npm/v/create-dsh-plugin-cli.svg)](https://www.npmjs.com/package/create-dsh-plugin-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/create-dsh-plugin-cli.svg)](https://nodejs.org)

中文 · [English](https://github.com/carbide4826/dsh-plugin-cli/blob/main/README.en.md)

交互式脚手架 CLI,一键搭建 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh`)插件项目骨架。

- npm 包名:`create-dsh-plugin-cli`,bin 命令:`dshp`
- 双轨配套:latest 与 next 轨现均配 dsh `0.2.1-rc.2`;`--target` 选择,默认 latest
  - 注:官方 npm 的 latest / next 现同为 `0.2.1-rc.2`,本 CLI 的 latest 轨已追平;轨名是稳定容器,不随版本改名
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

```sh
dshp --help              # 主命令总览
dshp create --help       # create 的完整选项与场景/案例一览
dshp list                # 一览能选什么(预设/案例/原子/事件域/界面位/缝/两轨版本配套)
dshp list --json         # 同上,机器可读(agent / MCP 直接消费)
dshp spec                # 一次访谈要问什么(问法 / 能不能跳过 / 选项)
dshp spec --json         # 同上,机器可读(agent / MCP 直接消费)
dshp mcp                 # 起 MCP server(stdio),把生成能力交给模型
```

`dshp list` 是**权威实时清单**:有哪些原子、界面位落到哪个宿主包的哪个槽位键、界面位要配
哪些原子、某条轨钉的 dsh 版本,跑它就行。

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
│  ● latest · dsh 0.2.1-rc.2
│  ○ next · dsh 0.2.1-rc.2
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

配套 next 轨宿主(`--target next`,生成项目按 dsh 0.2.1-rc.2 钉版;latest 轨与交互式生成同样适用):

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
| `--dry-run`                 | 布尔                          | 关(打印将生成的文件清单,不落盘) |

> 精选案例不适用 `--tool-name` / `--pkg-position` / `--config`(生成结构随案例锁定)。

#### 自由组合(非交互)

给了任一能力类参数即走这条路径,不进交互问卷:

```sh
dshp create my-orders --atoms tool,ui --ui-surfaces settings-card --config dynamic \
  --tool-name query_orders --target next
```

| 参数                        | 取值                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `--atoms <list>`            | `tool` / `events` / `service` / `ui` / `protocol`(逗号分隔) |
| `--event-domains <list>`    | `tools` / `agent` / `session` / `approval` / `fs` / `settings` |
| `--ui-surfaces <list>`      | `settings-card` / `chat-node` / `input-dock` / `sidebar` / `tool-view` / `session-header` |
| `--service-seams <list>`    | `llm` / `systemPrompt` / `subagents` / `web` / `commands` / `storage` |
| `--new-service`             | 布尔(新建自有服务,配合 `--atoms service`)                   |

硬约束由 CLI 校验并以**稳定错误码**报错(文案随语言变,code 不变):未知 id
(`ATOM_UNKNOWN` / `EVENT_DOMAIN_UNKNOWN` / `UI_SURFACE_UNKNOWN` / `SEAM_UNKNOWN`)、
界面位缺依赖原子(`SURFACE_REQUIRES_ATOM`,如 `tool-view` 缺 `tool`)、
`settings-card` 配 `config=none`(`CONFIG_NONE_REQUIRES_SETTINGS_CARD`)。

## 生成之后

```sh
cd my-plugin
pnpm install                                # ① 安装依赖
pnpm approve-builds                         # ② 放行依赖的构建脚本
pnpm add -D @deepseek-ai/dsh@0.2.1-rc.2    # ③ 安装 dsh 宿主
pnpm build                                  # ④ 构建
pnpm dsh web --patch ./dev.patch.yml        # ⑤ 启动 dsh 宿主(直载源码调试)
```

② 的放行清单分两组,别混:

- **装插件自身依赖**:只有用到 llm 能力的插件会被拦下(`@google/genai` / `protobufjs`)。
  这两个包的脚本是 no-op,按官方 dsh 的口径**列出来填 `false`** 拒绝执行;但不列出来 install
  会直接失败,所以必须列。
- **装宿主 CLI**:`dsh-subprocess-local` / `koffi` / `node-pty` 要真跑(原生模块编译、装
  spawn helper),填 `true`。

pnpm 11 严格模式下未处理的构建脚本会让 install 直接失败(不是警告)。`pnpm approve-builds`
只能写 `true`;要拒绝执行又不失败,得手写 `pnpm-workspace.yaml` 的 `allowBuilds` 段。

生成项目结构(随能力勾选增减):

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
> 宿主命令行参数多而杂,`docs/dsh-command-builder.html` 是可视化组装器:浏览器打开,点选增删 flag,拼出完整命令后复制运行。

## 一次访谈问全

`dshp spec` 打印「一次生成要问用户哪些问题」—— 每步问什么、能不能跳过、跳过用啥默认、选项从哪来。
这张表是给 **agent 用的**:模型照着它逐项问用户,而不是把 CLI 的参数表甩给用户。

```sh
dshp spec                 # 人读:访谈清单
dshp spec --json          # 机器读:步骤 + 问法 + 跳过后果 + 选项
dshp spec --mode free     # 只看自配路线的步骤
```

MCP 侧对应 `dshp_spec` tool:传入已收集的规格,返回还缺哪几步、够不够开跑,以及收齐后编译出的
参数。典型循环:

```
空规格 → dshp_spec(拿第一问) → 问用户 → 并进规格 → dshp_spec(看还缺什么)
       → … → ready=true → dshp_create_plugin 生成
```

## Agent skill

本包随附一份 agent skill(`skills/dshp/`),教 agent 用 dshp 生成 dsh 插件工程,并沉淀了一批只踩一次
就会记住的坑(approve-builds 放行、cordis 双实例、typecheck 假绿、界面位必须 `build` + `plugin add`
才渲染)。

skill 正文是**英文**的 —— 它是给模型读的,英文更省 token、模型理解也稳。frontmatter 的触发词中英都有,
中英文提问都能命中。「要问什么」现取 `dshp spec --json`,拿不到 CLI 时才回落到 skill 内的快照。

skill 随 npm 包一起发布。取出来放进你的 agent 的 skill 目录即可(目录名各 agent 不同,常见是 `~/.claude/skills/` 或 `~/.minimax/skills/`):

```sh
npm pack create-dsh-plugin-cli          # 取包
tar -xzf create-dsh-plugin-cli-*.tgz package/skills/dshp
cp -r package/skills/dshp ~/.minimax/skills/dshp
```

skill 里附带一个驱动脚本,是自由原子组合的可脚本化入口,产出**纯生成器产物**(零手改),另加生成后
自检与 JSON 摘要:

```sh
node skills/dshp/scripts/drive-questionnaire.mjs --dir my-orders --target next \
  --atoms tool,ui --surfaces settings-card --tool-name query_orders
```

## MCP server

本包自带一个 MCP server(`dshp mcp`,stdio 协议),把生成能力直接交给模型。

```sh
dshp mcp --lang zh     # 起 MCP server(--lang 指定生成物语言,缺省按环境探测)
```

宿主配置示例:

```json
{
  "mcpServers": {
    "dshp": {
      "command": "npx",
      "args": ["-y", "create-dsh-plugin-cli", "mcp", "--lang", "zh"]
    }
  }
}
```

四个 tool:

| tool | 作用 |
| --- | --- |
| `dshp_list_scenarios` | 一览能选什么:预设 / 精选案例 / 原子 / 事件域 / 界面位 / 缝(带宿主包、槽位键、依赖原子) |
| `dshp_spec` | 访谈清单 + 缺项判定:每步问什么、能不能跳过、还缺哪几步、够不够开跑 |
| `dshp_doctor` | 体检本机环境:node 版本、pnpm、dsh CLI、两轨素材与生成管线自检、当前目录可写性 |
| `dshp_create_plugin` | 生成插件项目(预设 / 精选案例 / 自由组合三种模式) |

两个约定:

- **合法取值从源码派生**:tool 的入参 schema 由领域清单生成(原子 / 事件域 / 界面位 / 缝 / 预设 / 案例 id 全是 enum),模型拿得到合法值,不会握着过期的 id 反复重试。
- **写盘要显式确认**:`dshp_create_plugin` 缺省只算计划(`dryRun` 默认 true),先返回将生成哪些文件;确认后用同样的参数再调一次、显式传 `dryRun: false` 才落盘。

失败一律带稳定错误码(如 `SURFACE_REQUIRES_ATOM` / `DIR_EXISTS` / `CASE_NOT_FOUND`),不是本地化句子。

> 宿主 spawn 子进程时通常只继承 `HOME` / `PATH` / `SHELL` / `TERM` / `USER` 等少数环境变量,**不含 `LANG`** —— MCP 侧因此探测不到系统语言。中文环境下请用 `--lang zh` 起服务,或在调用 `dshp_create_plugin` 时传 `lang: "zh"`。

## 版本说明

**轨道与配套**(生成时以 `--target` 选择,默认 latest;官方 npm 的 latest / next 现同为 `0.2.1-rc.2`,本 CLI 两轨均已配套该版本):

| 轨道 | dsh 宿主 | 关键配套(cordis / schemastery) |
| --- | --- | --- |
| `latest` | `0.2.1-rc.2` | `~4.0.5` / `~3.18.5` |
| `next` | `0.2.1-rc.2` | `~4.0.5` / `~3.18.5` |

依赖与宿主版本精确配套;混用不配套的组合可能在安装树中产生双实例,导致类型声明合并冲突、typecheck 失败。

**宿主对插件的版本门控**:dsh 在安装与加载插件时,会校验插件 `peerDependencies` 中所有 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-*` 声明(其余依赖不参与),与运行中的 dsh 版本不满足即**拒绝安装**并提示 incompatible。因此产物只装得进与其 peer 相匹配的宿主:两轨同版的当前态下产物互通,一旦晋升拉开差距,老轨产物就装不进新宿主,反之亦然——请保持产物轨道与宿主版本一致。确需跨版本强装,可用官方豁免命令(安装被拒时终端会给出完整命令):

```sh
dsh plugin --profile web allow-version <插件名>@<插件版本> --dsh-version <宿主版本> --accept-risk
```

> 豁免仅表示明确接受风险,跨轨产物的功能不保证。

**插件展示信息**:宿主插件管理页的名称 / 介绍 / 图标来自插件包的 `locale/<语言>.json`(`meta.title` / `meta.description`,按宿主界面语言选择,英文兜底)与 `package.json` 的 `icon` 字段;本项目模板已默认携带,改文案编辑 `locale/zh.json` 即可。

## 版本变更日志

各版本的完整变更内容见 [CHANGELOG.md](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.md)(英文版:[CHANGELOG.en.md](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.en.md))。

## 后续规划

- `--template` 自定义模板源:支持 local path / git URL / npm 包

已交付:双语界面与生成物 README(`--lang zh|en`)、双轨模板(`--target` 选择)、随 dsh 版本线
持续适配、agent skill 与 MCP server。

## License

[MIT](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
