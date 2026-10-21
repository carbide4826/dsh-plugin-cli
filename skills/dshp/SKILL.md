---
name: dshp
description: |
  Scaffold a DeepSeek Harness (dsh) plugin project with the dshp CLI, then verify it installs,
  type-checks, builds and loads into a dsh host. Use when the user asks to "create a dsh plugin",
  "scaffold a plugin for DeepSeek Harness", "生成 dsh 插件", "写个 dsh 插件骨架", mentions dshp
  or create-dsh-plugin-cli, or wants a new dsh plugin project started from scratch. Do NOT use
  for editing an existing dsh plugin's source code, for developing the dsh host itself, or for
  plugins of other frameworks.
---

# dshp — 生成 dsh 插件工程

`dshp`(npm 包 `create-dsh-plugin-cli`)生成 DeepSeek Harness 插件工程骨架。产物可直接
`pnpm install && pnpm typecheck && pnpm build`,再被 `dsh web --patch` 直载调试。

本 skill 覆盖的是「从零生成一个能跑起来的 dsh 插件工程」;改已有插件的代码不走这里。

## 核心:这是一次访谈,不是一张填空表

`dshp create` 的参数表是**给已经想清楚的人**用的。把参数表直接甩给用户,用户答不了
「原子要勾哪几个」这种问题 —— 于是要么跳过、要么瞎勾,生成的东西不对还要返工。

所以本 skill 的主流程是**先访谈、再生成**:

- **一次只问一项**,用宿主提供的**结构化提问功能**(如 `ask_user` 问卷 UI)。别在聊天框里
  平铺一串问题,用户会分不清哪些必答、哪些能跳。
- **每一项都带「跳过」**。跳过 = 不填该项,交给 CLI 的默认值(清单里写了跳过的后果)。
  用户说「你定就行」就整份跳过,别反复确认。
- **选项顺序按需求排**:与用户描述相符的选项排最前,并在提示里说明**为什么推荐它**;
  其余列在后面。用户一眼看到的是最贴近自己需求的那个。
- **给建议,不要替用户决定**:建议要有理由,让用户能改。用户明确说「按你说的来」才自己定。
- **收齐了才动手**。信息不够就继续问,不要先跑一个错的骨架再返工。

清单在代码里(`src/core/spec.ts`),三边共用一个源:

| 取法 | 命令 |
| --- | --- |
| 人读 | `dshp spec` |
| 机器读 | `dshp spec --json` |
| MCP | `dshp_spec` tool(带缺项判定) |

⚠️ **不要凭记忆抄清单**。清单会随 CLI 加参数而变;要问什么、哪些可跳过,以上面三种取法
现取的为准。`dshp list --json` 给的是「能选什么」(预设/案例/原子/事件域/界面位/缝),
`dshp spec --json` 给的是「要问什么」——两个都要。

逐步清单(问法 / 跳过后果 / 规格键 → CLI 参数对照表)见 [references/interview.md](references/interview.md)。

## Procedure

### 1. 问需求(开放式,一句话)

用结构化提问功能问一句开放式的话,让用户说这个插件要干什么:

> 这个插件要做什么?一句话描述用途就行(比如「查订单」「接外部 webhook」「加一个设置卡片」)

**这一步不要给选项**。用户答完之后,后面每一步的选择都要靠它 —— 先问需求再给建议,
反过来就是让用户在选项里找自己的需求。

### 2. 给建议 + 选路线(模板 vs 自配)

拿到需求后,先给**两条路**的对比建议,再让用户选:

| 路线 | 适合 | 产物 |
| --- | --- | --- |
| 走模板 | 需求贴近某个现成形态(「查订单」→ `quick-tool`;「接外部 webhook」→ `webhook-bridge`) | 真实工程整份拷贝,身份已重写,**省掉全部手改** |
| 自己配 | 要精确的能力组合,或需求介于两者之间 | 纯生成器产物(零手改),但组合由你逐项定 |

选「走模板」→ 第 3 步;选「自己配」→ 第 4 步。

> 别跳过建议直接问「用哪个模板」。**建议要带理由**(「你说要查订单,`quick-tool` 就是
> 自定义查询工具 + 结果卡片」),用户能据此改。

### 3. 模板路线:列候选,让用户选

从 `dshp list --json` 取现成的预设组合与精选案例(两轨的案例集可能不同,按目标轨看)。
**把与需求相符的排最前**,其余按「相关度」往下排:

> 推荐 `quick-tool`:你说要查订单,这个案例就是「自定义查询工具 + 结果卡片」,工具与界面都现成。
> 其他可选:`model-gateway`(接自有模型服务)、`webhook-bridge`(外部事件桥接进会话)、
> `notebook`(用户数据存取)、`session-bot`(监听会话自动响应)。

用户选定后,记下 `template` 与 `templateKind`(预设组合 / 精选案例),跳到第 5 步。

### 4. 自配路线:先原子,再按原子追问

**先问原子** —— 原子决定插件的能力面(工具 / 事件 / 服务 / 界面 / 协议)。选项来自
`dshp list --json` 的 `atoms`,**与需求相符的排最前并说明理由**,其余列后:

> 推荐勾 `tool`(你要对外提供查询能力)和 `ui`(要在会话里展示结果)。
> 其余可选:`events`(订阅宿主事件)、`service`(扩展能力缝)、`protocol`(提供 HTTP 端点)。

⚠️ **界面位必须同勾 `ui` 原子**(`tool-view` 还要 `tool`):界面位实现由 `ui` 原子产出,
缺了界面位选择会被**静默丢弃**,生成物里根本没有 `client/`。

勾完原子后,按原子追问对应清单(没勾的能力不问,别问无关的):

| 勾了 | 接着问 | 清单键 |
| --- | --- | --- |
| `events` | 订阅哪些事件域 | `eventDomains` |
| `ui` | 挂哪些宿主界面位 | `uiSurfaces` |
| `service` | 扩展哪些能力缝 / 要不要新建自有服务 | `serviceSeams` / `newService` |
| `tool` | 工具叫什么名字 | `toolName` |

### 5. 逐项问细节(每一项都可跳过)

这几项决定工程「长什么样、叫什么、放哪」,**逐个问、一项一个提问框**,每项都给「跳过」:

| 问 | 清单键 | 跳过 = |
| --- | --- | --- |
| 工程放在哪、叫什么? | `dirName` | 当前目录下的默认名(预设 `my-tool` 等 / 案例用案例 id / 自配 `my-plugin`) |
| npm 包名用什么? | `pkgName` | 与插件 id 同值 |
| 插件 id 用什么? | `pluginId` | 与目录名同值 |
| 包定位(bundle / library)? | `pkgPosition` | `bundle` |
| 配套哪一代 dsh 宿主? | `target` | `latest` |
| 要不要带配置?怎么配? | `config` | 按所选界面位推导(无界面位则 `none`) |
| 插件描述 / 作者 | `description` / `author` | 预设默认值 / 空 |
| 生成物用哪种语言? | `lang` | 按环境探测 |

⚠️ **存储位置要说清**:可以给相对路径(如 `apps/my-orders`)或绝对路径;目录已存在会直接
失败,不要先占位再生成。

⚠️ **配置方式与界面位冲突**:选了 `settings-card` 界面位时不能配 `config: none`
(设置卡片必须有配置可展示)。此时给 `static` / `dynamic` 两个选项。

⚠️ **描述与作者在生成时就给上**:事后手改要动 `package.json` 与 `locale/*.json` 两处,
不如一次给对。

### 6. 收齐 → 编译成参数 → 生成

问完之后,先用缺项判定确认收齐了(`dshp spec --json` 或 MCP `dshp_spec`,传入已收集的规格;
`ready` 为 true 才够开跑)。没齐就继续问剩下那几项。

然后把规格编译成 CLI 参数再生成 —— **参数形态与 CLI 需要的那份完全一致**:

```sh
npx create-dsh-plugin-cli create <dir> [能力参数] [--target <latest|next>] [--lang <zh|en>] ...
```

- 模板路线:`--template <preset>` 或 `-s --template <case>`
- 自配路线:`--atoms <list>` / `--event-domains <list>` / `--ui-surfaces <list>` /
  `--service-seams <list>` / `--new-service` / `--tool-name <name>` / `--config <mode>`
- `-s` 必须配 `--template`,单独给会报错退出。

⚠️ **自由组合路线一个原子都没选时也要给 `--atoms ""`**(空值仍走非交互路径,否则会落进交互
问卷)。

宿主挂了 MCP 时,用 `dshp_create_plugin` 代替命令行:入参与 CLI 参数同形,
**缺省只算计划,确认后再调一次并显式传 `dryRun: false` 才落盘**。

### 7. 验证三步(不能跳,跳了等于没验)

```sh
cd <dir>
pnpm install
pnpm typecheck
pnpm build
```

- `pnpm install` 可能被 pnpm 拦依赖的构建脚本(报 `ERR_PNPM_IGNORED_BUILDS`)。pnpm 11 默认
  `strict-dep-builds: true`,被跳过的构建脚本**直接抛错让 install 失败**(不是警告)。按提示
  `pnpm approve-builds` 放行;pnpm 会把待决项写进生成物的 `pnpm-workspace.yaml` 的
  `allowBuilds` 段(占位值 `set this to true or false`),填 `true` 即可。**放行清单分两组**:
  - 装插件自身依赖(`pnpm install`):**只有用到 llm 能力**的插件要处理 `@google/genai` 与
    `protobufjs`(经 `dsh-llm-pi-ai → pi-ai` 带入)。这两个包的脚本**是 no-op** —— 官方 dsh 自己
    的 `pnpm-workspace.yaml` 就把它们写成 `false` 并注明「no-ops we don't need, so we deny them —
    install still succeeds」,**照官方填 `false`**(拒绝执行,install 照样成功);但**不列出来同样会
    失败**,所以必须列出来。不用 llm 的插件这一步零拦截。
  - 装宿主 CLI(`pnpm add -D @deepseek-ai/dsh`):`@deepseek-ai/dsh-subprocess-local` / `koffi` /
    `node-pty` 这三个**要真跑**(原生模块编译 / 装 spawn helper),选 `true`。
  - ⚠️ `pnpm approve-builds` 只能写 `true`(官方插件页的「允许这些脚本并重试」同样只写 `true`);
    要「拒绝执行但不让 install 失败」只能手写 `pnpm-workspace.yaml` 的 `allowBuilds` 段。
- ⭐ **typecheck 必须在依赖装全的项目目录里跑**。类型来源包不在 node_modules 时,`tsc` 的
  `skipLibCheck` 会吞掉解析失败、类型退化成 `any`,于是 **typecheck 假绿** —— 旧错误代码
  在缺依赖的环境里照样"通过"。所以:先 `install` 成功再 `typecheck`,别在没装依赖的目录里跑。
- `pnpm build` 失败多半是 UI 项目的 CSS 管线缺 `@tsdown/css`(生成物已带,装不上就是 install 没成功)。

### 8. 装宿主并联调

```sh
pnpm add -D @deepseek-ai/dsh@<版本>     # 版本取自生成物 package.json 里 @deepseek-ai/dsh-* 的钉版
```

⚠️ **别裸装 npm 上的 `latest`**。生成物的 peer 精确钉在某个版本上,宿主门禁用
`semver.satisfies(..., includePrerelease)` 判定,装错版本就是「预检阶段直接拒,nothing was
installed」。上游 dist-tag 会滚(2026-10-20 实测 latest/next 均为 `0.2.1-rc.2`,本仓两轨已同版),
但**一旦上游再滚一版,产物 peer 仍钉旧版,新宿主会拒收**。版本以生成物 `package.json` 为准。

冒烟(不启动,先确认组合树里有本插件行):

```sh
pnpm dsh web --patch ./dev.patch.yml --dump-config | grep -A 4 <plugin-id>
```

看到插件行即加载成功。再选一种启动方式:

- **直载源码(开发期)**:`pnpm dsh web --patch ./dev.patch.yml`。改源码即时生效。
- **装产物(发布前)**:`pnpm dsh plugin --profile web add .` 后再 `pnpm dsh web`。
  ⭐ **含界面位的插件必须走这条**:`--patch` 直载没有 npm 包身份,浏览器侧槽位不会注册,
  界面位静默不渲染。

`dev.patch.yml` 是生成物,含本机绝对路径,已在 `.gitignore` 里 —— 不要提交,不要手改。

### 9. 报告

告诉用户:生成了什么(目录 + 走了哪条路线 + 用了哪个模板/原子组合 + 哪条轨)、访谈里哪些项
是跳过的(跳过的项意味着什么默认值)、验证跑到哪一步(装依赖/类型/构建/组合树)、接下来怎么启动。
若某步没跑成,明确说是哪一步、为什么。

## Failure handling

| 症状 | 根因 | 处置 |
| --- | --- | --- |
| `ERR_PNPM_IGNORED_BUILDS` | pnpm 拦截了依赖的构建脚本 | `pnpm approve-builds` 放行提示的包 |
| typecheck 报 `Cannot find module` | 类型包没装上或没在本目录跑 | 回到项目目录确认 `install` 成功再跑 |
| typecheck 绿但代码明显有问题 | 缺依赖时 `skipLibCheck` 吞掉解析失败(假绿) | 在依赖装全的环境重跑;仍绿才是真绿 |
| `ctx.slots` 类型报错 / Config 类型劈叉 | cordis 或 schemastery 出现第二实例 | 依赖版本必须与官方元包声明精确/tilde 对齐,别手改成浮动 range |
| 界面位在 Web UI 里不渲染 | 只走了 `--patch` 直载 | `pnpm build` + `pnpm dsh plugin --profile web add .` |
| `dsh plugin add` 被拒(rejected) | 宿主 peer 门禁:比对 peerDependencies 里的 dsh/dsh-* 条目 | 装与生成物 peer 钉版一致的宿主版本;确需跨版用 `dsh plugin allow-version` 精确配对 |
| 生成器报目录已存在 | 目录占用是失败态 | 换目录名,不要覆盖 |
| `SURFACE_REQUIRES_ATOM` | 选了界面位却没同勾 `ui` 原子(`tool-view` 还要 `tool`) | 补上原子,或去掉该界面位 |
| 启动时端口占用 / 别的插件串进来 | `web` profile 是共用的 | 换自己命名的 profile 隔离 |

排障细节(契约变化、依赖钉版规则、门禁语义)见 references/host-contracts.md。

## 事实核对纪律

本 skill 与三份 reference 里的版本号、槽位键、包名、清单条目都是**快照**,会随上游滚动失效。
涉及「宿主现在是什么行为」「现在能选什么」的判断,别只信快照 —— 直接读源头,成本不高:

- **要问什么、哪些可跳过**:`dshp spec` / `dshp spec --json`(权威实时清单)——
  访谈步骤、问法、跳过后果、选项来源,全在这儿。
- **能选什么**:`dshp list` / `dshp list --json` —— 预设/案例/原子/事件域/界面位/缝/两轨版本配套。
- 宿主契约与槽位定义:`dsh-fork` 仓库的 `packages/client/**/slot-contract.ts`、
  `packages/boot/app-boot/src/plugin-compatibility.ts`(门控规则)。
- 依赖配套:`npm view @deepseek-ai/dsh@<版本> dependencies`。
- 工具链行为:本机 pnpm 的实现(比如 `allowBuilds` 与 `onlyBuiltDependencies` 的实际生效项)。

快照过期时以你当场读到的为准,并把差异写进给用户的答复里。

## Examples

Input:「帮我起一个能查订单的 dsh 插件工程」
Output: 先问需求 → 建议「走模板,`quick-tool` 就是自定义查询工具 + 结果卡片」→ 用户确认 →
问存储位置与命名(其余跳过)→ `dshp create my-orders -s --template quick-tool --lang zh`
→ `pnpm install && pnpm typecheck && pnpm build` 三步跑通 → 报告生成的目录、跳过的项
(包名/插件 id 默认与目录名同值)与启动命令(`pnpm dsh web --patch ./dev.patch.yml`;
若要做设置卡片则再 `plugin add`)。

Input:「用 next 轨起一个接外部 webhook 的插件」
Output: 需求 → 建议「`webhook-bridge` 案例正是外部事件桥接进会话,next 轨配套 dsh 0.2.1-rc.2」
→ 确认后 `dshp create my-hook -s --template webhook-bridge --target next --lang zh`,
再按第 7、8 步验证;报告时点明 next 轨当前钉的 dsh 版本(取自生成物 package.json)。

## Windows (win32) platform notes

仓库只在 macOS/Linux 上实测过,Windows 未验证。命令等价:

- `grep` 不可用 → 用 `findstr /C:"<plugin-id>"`,或直接看 `--dump-config` 全量输出。
- `pnpm approve-builds` 交互在 Windows 同样可用;不能交互时改 `pnpm-workspace.yaml` 的
  `onlyBuiltDependencies` / `allowBuilds` 白名单直接放行。
- 路径分隔符差异不影响本 skill 的步骤(生成器自己拼路径),但 `dev.patch.yml` 里的绝对路径
  是 Windows 风格,手工编辑时注意。
