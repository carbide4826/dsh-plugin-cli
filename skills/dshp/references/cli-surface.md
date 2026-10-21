# CLI 表面与生成物结构

> 本文件是**快照**。清单会随版本增删,实时发现方法见文末「实时发现」。快照只用于快速定位,
> 关键决策以实时发现的结果为准。

## 子命令与选项

| 子命令 | 作用 |
| --- | --- |
| `create [name]` | 生成插件项目(预设 / 精选案例 / 自由组合 / 交互问卷) |
| `list [--json]` | 一览能选什么;`--json` 机器可读 |
| `spec [--json] [--mode <m>]` | 一次访谈要问什么(问法 / 可否跳过 / 选项);`--json` 机器可读 |
| `mcp [--lang <lang>]` | 起 MCP server(stdio),把生成能力交给模型 |

`create` 的位置参数 `[name]` = 项目目录名(缺省:预设给默认目录名,交互给
`my-plugin`)。目标目录已存在 → 失败退出码 1。

`create` 的选项:

| 选项 | 取值 | 说明 |
| --- | --- | --- |
| `--template <source>` | 预设 id 或案例 id | 非交互入口;给了就走预设/案例路径,不进问卷 |
| `-s, --scenario` | 布尔 | 模板取自精选案例库(整目录拷贝)而非预设管线;必须配 `--template` |
| `--target <track>` | `latest` \| `next` | 配套哪一代 dsh 宿主;缺省 `latest` |
| `--pkg-name <name>` | 字符串 | 覆盖 npm 包名(缺省 = 插件 id) |
| `--plugin-id <id>` | 字符串 | 覆盖插件 id(缺省 = 目录名) |
| `--tool-name <name>` | 字符串 | 覆盖工具名(仅 tool 预设有意义) |
| `--description <text>` | 字符串 | 覆盖描述(精选案例下替换案例默认描述) |
| `--author <name>` | 字符串 | 覆盖作者 |
| `--pkg-position <position>` | `bundle` \| `library` | 包定位;`library` 不生成 `cordis.patch.yml` |
| `--config <mode>` | `none` \| `static` \| `dynamic` | 配置方式;`none` 与 settings-card 互斥 |
| `--atoms <list>` | 逗号分隔 | 自由组合的原子(非交互);给了任一能力类 flag 就走自由组合路径 |
| `--event-domains <list>` | 逗号分隔 | 自由组合的事件域 |
| `--ui-surfaces <list>` | 逗号分隔 | 自由组合的界面位 |
| `--service-seams <list>` | 逗号分隔 | 自由组合的能力缝 |
| `--new-service` | 布尔 | 新建自有服务(配合 `--atoms service`) |
| `--dry-run` | 布尔 | 打印将生成的文件清单,不落盘 |
| `--lang <lang>` | `zh` \| `en` | program 级选项,缺省按 `LANG`/`DSHP_LANG` 探测 |

`--lang` 是 program 级:help 渲染也走它,非交互调用建议显式给,避免生成物语言与预期不符。

## 预设(组合被锁死)

| id | 锁定能力 | 默认目录 |
| --- | --- | --- |
| `tool` | tool 原子,toolName=`example_tool` | my-tool |
| `llm` | service 原子 + 新建服务 + llm 缝 | my-llm |
| `ui` | ui 原子 + settings-card 界面位 + 静态配置 | my-ui |
| `events` | events 原子 + session 域 | my-events |
| `protocol` | protocol 原子 | my-protocol |

预设可用 `--pkg-name/--plugin-id/--tool-name/--description/--author/--pkg-position/--config` 覆盖;
`--tool-name` 用在非 tool 预设上会被忽略(有告警)。

## 精选案例(整目录拷贝,`-s`)

案例 id **必须**带 `-s`;不带 `-s` 时按预设查,查不到即报"未知预设"退出。
反过来 `-s` 单独给(不带 `--template`)也报错退出。

| id | 形态 |
| --- | --- |
| `quick-tool` | 自定义查询工具 + 结果卡片(tool + tool-view) |
| `model-gateway` | 接入自有模型服务(llm 缝 + 设置卡片动态配置) |
| `session-bot` | 监听会话自动响应(events + llm 缝) |
| `webhook-bridge` | 外部事件桥接进会话(protocol + events) |
| `notebook` | 用户数据存取(storage 缝 + tool) |

案例路径下 `--tool-name/--pkg-position/--config` 不适用(结构随案例锁定),给了会有告警;
身份与元信息类参数(`--plugin-id/--pkg-name/--description/--author`)仍然生效。

拷贝时会把全树里出现的案例 id 按**词边界**替换成插件 id(覆盖 `export const name`、
`cordis.patch.yml` 的 id、`tsdown.config.ts` 的 client id、README 行文),包名不参与替换,
由 `--pkg-name` 结构化写入 `package.json`。

## 自由组合(非交互入口)

给了任一能力类 flag(`--atoms` / `--event-domains` / `--ui-surfaces` / `--service-seams` /
`--new-service`)就走这条路径,**不进问卷**:

```sh
dshp create my-orders --atoms tool,ui --ui-surfaces settings-card \
  --config dynamic --tool-name query_orders --target next
```

硬约束由 CLI 校验,失败即退出码 1 并给出稳定错误码(文案随语言变,code 不变):

| 错误码 | 触发条件 |
| --- | --- |
| `ATOM_UNKNOWN` / `EVENT_DOMAIN_UNKNOWN` / `UI_SURFACE_UNKNOWN` / `SEAM_UNKNOWN` | id 不在清单里 |
| `SURFACE_REQUIRES_ATOM` | 界面位依赖的原子没同勾(所有界面位都要 `ui`;`tool-view` 还要 `tool`) |
| `CONFIG_NONE_REQUIRES_SETTINGS_CARD` | `settings-card` 配了 `config=none` |
| `CONFIG_INVALID` / `PKG_POSITION_INVALID` | 取值非法 |
| `DIR_EXISTS` | 目标目录已存在 |

`--dry-run` 打印将生成的文件清单但不落盘(「先看清再写」的入口;MCP 路径的
「显式确认后写盘」也依赖同一层)。

## 可勾选清单(自由组合)

原子:`tool` / `events` / `service` / `ui` / `protocol`

事件域:`tools` / `agent` / `session` / `approval` / `fs` / `settings`

界面位:`settings-card` / `chat-node` / `input-dock` / `sidebar` / `tool-view` / `session-header`

缝:`llm` / `systemPrompt` / `subagents` / `web` / `commands` / `storage`

界面位对原子的硬依赖(缺原子会生成静默不渲染的哑界面):

| 界面位 | 必须同勾的原子 |
| --- | --- |
| 全部六个 | `ui`(界面位实现文件与 client 聚合入口由 ui 原子产出;缺了界面位选择被静默丢弃) |
| `tool-view` | 额外要 `tool`(它渲染的是工具调用) |

界面位 → 宿主包 → 槽位键(槽位键会随宿主版本变,包里带的是当前值):

| 界面位 | 宿主包 | 槽位键 |
| --- | --- | --- |
| `settings-card` | `@deepseek-ai/dsh-client-ui-settings-plugins` | `settings.plugins.tab` |
| `chat-node` | `@deepseek-ai/dsh-client-ui-chat` | `conversation.chat.node` |
| `input-dock` | `@deepseek-ai/dsh-client-ui-conversation` | `conversation.input.dock` / `conversation.composer.bar` |
| `sidebar` | `@deepseek-ai/dsh-client-ui-sidebar` | `sidebar.panellist` |
| `tool-view` | `@deepseek-ai/dsh-client-ui-tool` | `tool.call.toolview` |
| `session-header` | `@deepseek-ai/dsh-client-ui-conversation` | `conversation.session.header` |

另外:`settings-card` 必须配配置(不能 `config: none`);`config` 非 `none` 时才会引入
`@deepseek-ai/schemastery` 依赖。

## MCP server(`dshp mcp`)

宿主能挂 MCP 时,直接用 tool,比让 agent 拼 CLI 命令更稳(合法 id 由 schema 兜底)。

```sh
dshp mcp --lang zh     # stdio 协议;stdout 是 JSON-RPC 通道,别在里面写别的
```

宿主配置:

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

| tool | 作用 |
| --- | --- |
| `dshp_list_scenarios` | 一览能选什么(`scope`: all / presets / cases / capabilities;`target` 按轨收窄) |
| `dshp_spec` | 访谈清单 + 缺项判定(问什么 / 可否跳过 / 还缺哪几步 / 够不够开跑) |
| `dshp_doctor` | 体检本机:node 版本、pnpm、dsh CLI、两轨素材与生成管线自检、目录可写性 |
| `dshp_create_plugin` | 生成(`mode`: preset / case / free) |

要点:

- **合法取值在 schema 里**:原子 / 事件域 / 界面位 / 缝 / 预设 / 案例 id 全是 enum,
  模型拿到的是现值,不会握着过期 id 重试。
- **`dshp_spec` 是访谈的流程源**:入参是「已收集到的规格」,返回「还缺哪几步、够不够开跑」,
  以及齐了之后编译出的 CLI 参数与 create 参数。模型的正确用法是:空 spec 调一次拿第一问 →
  每问完一步并进 spec 再调一次 → `ready` 为 true 才生成。详见 references/interview.md。
- **写盘要显式确认**:`dshp_create_plugin` 缺省只算计划(`dryRun` 默认 true),返回将生成
  哪些文件;确认后同参数再调一次、传 `dryRun: false` 才落盘。
- **语言**:宿主 spawn 子进程通常不继承 `LANG`,环境探测拿不到用户语言 —— 中文环境
  用 `--lang zh` 起服务,或调用时传 `lang: "zh"`。
- 失败带稳定错误码(`SURFACE_REQUIRES_ATOM` / `DIR_EXISTS` / `CASE_NOT_FOUND` …),
  与 CLI 同码;产物与 CLI 逐字节一致。

## 生成物结构

```
<dir>/
  package.json        # 依赖三桶 / exports / files 白名单 / dsh 键 / icon
  cordis.patch.yml    # bundle 定位才有(library 不生成)
  dev.patch.yml       # 生成物:本机绝对路径,已 gitignore
  tsconfig.json  tsdown.config.ts  pnpm-workspace.yaml  .gitignore
  README.md           # 单语言交付(按 --lang 选素材)
  icon.svg            # 插件清单页图标
  locale/zh.json  locale/en.json   # meta 名称/介绍(宿主详情页读)
  src/index.ts        # 入口:name / inject / apply
  src/tool.ts  src/events.ts  src/seams/index.ts  src/client/index.ts ...
```

生成物自带 `pnpm-workspace.yaml`(workspace 定界),防止被祖先 workspace 劫持导致
`node_modules` 不生成 —— 所以**不要**加 `--ignore-workspace`。

`package.json` 的 `exports` 关键项:`"."` → `./dist/index.js`;bundle 定位另有
`"./package.json"`、`"./locale/*.json"`、`"./cordis.patch.yml"`;UI 项目另有 `"./client"`。
`files` 白名单必须显式列 `dist`(以及 `icon.svg`/`locale`/`cordis.patch.yml`),
否则 npm 回落到 `.gitignore` 当黑名单,产物会漏。

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 成功;或用户主动中止交互 |
| 1 | 失败:目录已存在、未知预设/案例/轨、非法 `--lang`/`--config`/`--pkg-position`、护栏拦截 |

## 实时发现(优先于本文件的快照)

**`dshp list` 是权威的实时清单** —— 预设 / 案例 / 原子 / 事件域 / 界面位 / 缝 / 两轨版本配套,
一次全给:

```sh
dshp list            # 人读
dshp list --json     # 机器读(agent / MCP 直接消费)
```

已安装包的素材目录是权威清单:

```sh
# 案例清单(每轨各一份)
ls node_modules/create-dsh-plugin-cli/templates/latest/scenarios
ls node_modules/create-dsh-plugin-cli/templates/next/scenarios

# 预设/案例说明与全部 flag
npx create-dsh-plugin-cli create --help
```

版本配套(每轨钉的 dsh 版本)从**生成物**读,不用猜:

```sh
# 生成物 package.json 里 @deepseek-ai/dsh-* 与 cordis/schemastery 的钉版
cat <dir>/package.json
```

## 驱动脚本:自由组合的便利壳

`scripts/drive-questionnaire.mjs`(随本 skill 同包发布)是 CLI 原生自由组合入口的**薄壳**:
参数 → CLI 原生 flag → 生成,另加「按勾选推应有的文件并自检,缺文件即非零退出」与
JSON 摘要。直接调 CLI 也一样。

> 演化史:这脚本原本是**驱动交互问卷**的(CLI 当时没有自由组合 flag,只能逆向 clack 的
> 按键语义,一次几十次试错)。CLI 有了原生入口后,按键驱动那套已删除 —— 顺带消掉了
> 「提示语文本即同步锚点,CLI 改文案即失配」这个脆点。

```sh
node scripts/drive-questionnaire.mjs --dir <项目目录> --target <latest|next> \
  --atoms <tool,events,service,ui,protocol> \
  [--events <tools,agent,session,approval,fs,settings>] \
  [--surfaces <settings-card,chat-node,input-dock,sidebar,tool-view,session-header>] \
  [--seams <llm,systemPrompt,subagents,web,commands,storage>] [--create-service] \
  --tool-name <工具名> \
  [--description <描述>] [--author <作者>] [--pkg-name <包名>] [--plugin-id <插件 id>] \
  [--pkg-position <bundle|library>] [--config <none|static|dynamic>] [--lang <zh|en>]
```

- `--atoms` 里含 `tool` 时必须给 `--tool-name`;含 `events`/`ui`/`service` 时必须给对应清单项
  或 `--create-service`(脚本在启动前就拦,不等 CLI 起来才说)。
- 脚本只调 CLI 不改产物:生成的每个文件都出自生成器,手改面为零。
- 生成后自检:按勾选推应有的文件(`src/tool.ts` / `src/events.ts` / `src/client/index.ts` …),
  缺文件即以非零退出并在 JSON 里列出 `missingFiles`。
- `--dry-run` 打印将要执行的命令,不执行。
- 脚本默认用同包 `dist/cli.mjs`;也可用 `--cli <path>` 指定别的 CLI(便于对改过的本地构建做验证)。
