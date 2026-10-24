# 访谈清单与生成规格

> 本文件是**快照**,只在拿不到 dshp CLI 时兜底 —— 清单会随 CLI 加参数而增删。
> 有 CLI 时以 `dshp spec --json` 现场取到的为准(见文末「实时发现」)。
>
> ⚠️ 拿不到 CLI 又照这份快照硬编参数,生成的插件「看着像」而不是「就是」:原子集合、
> 界面位依赖、依赖钉版都可能已经变了。这种情况要告诉用户需要一个带 `spec` 子命令的
> dshp CLI(npm 包 `create-dsh-plugin-cli`),**装不装由用户决定,不要自动装**。

## 为什么是「访谈」而不是「填空表」

`dshp create` 的参数表是给已经想清楚的人用的。把它直接甩给用户,用户答不了
「原子要勾哪几个」—— 于是要么跳过、要么瞎勾,生成的东西不对还要返工。

访谈的规矩(细节见 SKILL.md):

- **逐项确认**:一次确认一项(或几项),但每项都要能**单独跳过**。用结构化问卷还是普通
  对话,由你所在应用自己定 —— 关键是让用户知道「哪些必答、哪些能跳」。
- **每一项都带「跳过」**;跳过 = 不填该项 = 交给 CLI 的默认值。
- **选项顺序按需求排**:相符的排最前,并说明为什么推荐它。
- **收齐了才动手**(spec.ready 为 true)。

## 步骤清单(顺序 = 建议的提问顺序)

标注:`[preset/case/free]` = 只在该路线问;「可跳过」的行写了跳过的后果。
「步骤 id」是稳定的标识(跳过记录、缺项判定都靠它)。

| # | 步骤 id | 问什么 | 清单键 | 必答 | 跳过 = | 适用 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `need` | 这个插件要做什么?(开放式,不给选项) | `need` | ✓ | — | 全部 |
| 2 | `route` | 走现成模板还是自己配能力组合? | `route` | ✓ | — | 全部 |
| 3 | `template` | 用哪个模板? | `template` + `templateKind` | ✓ | — | `[preset/case]` |
| 4 | `atoms` | 要勾哪些能力原子? | `atoms` | ✓ | — | `[free]` |
| 5 | `domains` | 订阅哪些事件域? | `eventDomains` | 可跳 | 不订阅任何事件 | `[free]` 且勾了 `events` |
| 6 | `surfaces` | 挂哪些宿主界面位? | `uiSurfaces` | 可跳 | 不做界面 | `[free]` 且勾了 `ui` |
| 7 | `seams` | 扩展哪些能力缝? | `serviceSeams` | 可跳 | 不扩展缝 | `[free]` 且勾了 `service` |
| 8 | `newService` | 要不要新建自有服务? | `newService` | 可跳 | 不新建 | `[free]` 且勾了 `service` |
| 9 | `toolName` | 工具叫什么名字? | `toolName` | 可跳 | `example_tool` | `[free]` 且勾了 `tool` |
| 10 | `config` | 要不要带配置? | `config` | 可跳 | 按界面位推导(无界面位则 `none`) | 全部 |
| 11 | `dirName` | 工程放在哪、叫什么? | `dirName` | 可跳 | 当前目录下的默认名 | 全部 |
| 12 | `pkgName` | npm 包名用什么? | `pkgName` | 可跳 | 与插件 id 同值 | 全部 |
| 13 | `pluginId` | 插件 id 用什么? | `pluginId` | 可跳 | 与目录名同值 | 全部 |
| 14 | `pkgPosition` | 包定位(bundle / library)? | `pkgPosition` | 可跳 | `bundle` | 全部 |
| 15 | `target` | 配套哪一代 dsh 宿主? | `target` | 可跳 | `latest` | 全部 |
| 16 | `description` | 插件描述? | `description` | 可跳 | 预设默认值(自配则空) | 全部 |
| 17 | `author` | 作者? | `author` | 可跳 | 空 | 全部 |
| 18 | `lang` | 生成物用哪种语言? | `lang` | 可跳 | 按环境探测 | 全部 |

第 4 步的原子清单(选项现取,`dshp list --json` 的 `atoms`):

`tool`(暴露工具) · `events`(订阅宿主事件) · `service`(扩展能力缝) · `ui`(宿主界面位) ·
`protocol`(HTTP 协议端点)

⚠️ **界面位必须同勾 `ui` 原子**(`tool-view` 还要 `tool`):界面位实现由 `ui` 原子产出,
缺了界面位选择会被**静默丢弃**,生成物里根本没有 `client/`。

## 规格键 → CLI 参数

规格的键与 `dshp create` 的参数同形,一份规格能编译成两种形态:

| 规格键 | CLI 参数 | create 工具入参 |
| --- | --- | --- |
| `mode: "preset"` + `template` | `--template <id>` | `mode: "preset"`, `preset: <id>` |
| `mode: "case"` + `template` | `-s --template <id>` | `mode: "case"`, `case: <id>` |
| `mode: "free"` + `atoms` | `--atoms <a,b>` | `atoms: [...]` |
| `eventDomains` | `--event-domains <a,b>` | `eventDomains` |
| `uiSurfaces` | `--ui-surfaces <a,b>` | `uiSurfaces` |
| `serviceSeams` | `--service-seams <a,b>` | `serviceSeams` |
| `newService: true` | `--new-service` | `newService` |
| `toolName` | `--tool-name <name>` | `toolName` |
| `config` | `--config <mode>` | `config` |
| `dirName` | 位置参数 | `dirName` |
| `pkgName` | `--pkg-name <name>` | `pkgName` |
| `pluginId` | `--plugin-id <id>` | `pluginId` |
| `description` | `--description <text>` | `description` |
| `author` | `--author <name>` | `author` |
| `pkgPosition` | `--pkg-position <p>` | `pkgPosition` |
| `target` | `--target <track>` | `target` |
| `lang` | `--lang <zh\|en>` | `lang` |

⚠️ **自由组合路线一个原子都没选时也要给 `--atoms ""`** —— 空值仍是非交互路径,
不给会落进交互问卷。

## 跳过怎么记

跳过的步骤把 **步骤 id** 记进 `skipped`(如 `skipped: ["author", "description"]`)。
步骤 id 见上表的「步骤 id」列(`need` / `route` / `template` / `atoms` / …)。
不记也行 —— 缺项判定只看「该键有没有值」,但记了能看出哪些项是用户主动跳过的,
汇报时要说清「跳过了什么 ⇒ 用什么默认」。

## MCP 侧怎么用

`dshp_spec` tool 的入参:`spec`(已收集到的规格,键同上)+ `mode`(只看某条路线)。

返回:

| 字段 | 含义 |
| --- | --- |
| `steps[]` | 全部步骤 + 现取的选项 + 每步状态(`pending` / `answered`) |
| `next` | 下一问(建议问这个) |
| `pending[]` / `requiredPending[]` | 还该问的 / 其中必答的 |
| `ready` | 必答项都齐了 = 可以开跑 |
| `cliArgs` / `createArgs` | 齐了之后编译出的参数(两种形态) |

典型循环:空 spec 调一次拿第一问 → 每问完一步把答案并进 spec 再调一次 →
`ready` 为 true 后用 `createArgs` 调 `dshp_create_plugin`(缺省只算计划,
确认后显式传 `dryRun: false` 才落盘)。

## 实时发现(优先于本文件的快照)

```sh
dshp spec            # 人读:访谈清单
dshp spec --json     # 机器读:步骤 + 问法 + 跳过后果 + 选项
dshp spec --mode free  # 只看自配路线的步骤
dshp list --json     # 能选什么(预设/案例/原子/事件域/界面位/缝)
```

宿主挂了 MCP 时,同样的两件事分别是 `dshp_spec` 与 `dshp_list_scenarios`。

⚠️ 这些命令要**带 `spec` 子命令的 dshp CLI**(npm 包 `create-dsh-plugin-cli`)。
没有它 → 本文件的快照只是兜底,**别照快照硬编参数**(见文首)。
