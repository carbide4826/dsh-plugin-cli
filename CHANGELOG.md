# Changelog

本项目的所有重要变更都记录在此文件中。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

中文 · [English](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.en.md)

## [Unreleased]

### 变更

- 双轨跟随上游 dsh `0.2.1-rc.2`:官方 npm 的 latest / next 已同收编到该版本(registry 序列差值 7),latest 轨随之追平,两轨同钉 `0.2.1-rc.2`;配套版本按官方元包声明同步(cordis `~4.0.5` / schemastery `~3.18.5`)。模板零改动 —— 素材一律走版本占位符,引用到的 31 个 dsh 子包在新版全部存在,槽位键/事件名/工具调用块形状等契约复核全通。
- 错误改成**稳定错误码 + 文案**两层:新增 `src/core/errors.ts`,`DshpError{code, params}` 的 code 是程序可分支的契约(文案随 `--lang` 变,code 不变),CLI 层按 code 渲染人话。此前失败一律表达成 `throw new Error(t(...))`,调用方只能匹配本地化句子,无法当接口用 —— MCP 尤其致命。
- 自由组合的能力校验抽到 `src/core/capabilities.ts`(纯函数):原子/事件域/界面位/缝的取值校验、界面位依赖原子的硬约束、`settings-card` 与 `config=none` 的互斥,与交互问卷共用同一套规则,不各写一份。
- 生成拆成 plan 与 write 两层:新增 `planProject()` 算出全部待落盘文件但**不写盘**,`writeProject()` 降级为 plan + 落盘(产物逐字节一致)。`--dry-run` 与将来的 MCP「显式确认后写盘」都基于这层。
- Agent skill 的驱动脚本重写:391 行的交互问卷按键驱动退役,改为 242 行的薄壳(参数 → CLI 原生 flag → 生成,保留参数校验、生成后自检与 JSON 摘要,旧参数面兼容)。顺带消掉「提示语文本即同步锚点,CLI 改文案即失配」这个脆点。
- 生成入口收敛为**一份规则**:新增 `src/core/create.ts`(解析 / 计划 / 落盘三段式),CLI 的四条路径(预设 / 精选案例 / 自由组合 / 交互问卷)与 MCP 都调它。此前 CLI 内部有四处落盘调用点,校验逻辑散在命令行分支与问卷里,两边容易漂。改造后新旧 CLI 在 8 组参数下产物逐字节一致。

### 新增

- **一次访谈问全**:新增 `dshp spec` 子命令(人读 / `--json` 机器读 / `--mode <路线>` 只看某条路线),
  打印「一次生成要问用户哪些问题」—— 每步的问法、能不能跳过、跳过用啥默认、选项从哪来(选项现取,
  不抄快照)。此前 skill 与 MCP 都只是「CLI 参数的转述」,模型拿到的是一张填空表,问得太浅
  (存储位置 / 命名 / 工具名 / 要不要配置全靠默认兜),现在这张表成了「问什么」的事实源。
- 新增 `src/core/spec.ts`:访谈清单 + 缺项判定(`specGaps`:还缺哪几步、够不够开跑、下一问该问什么)
  + 规格 → CLI 参数 / create 入参的编译(`specToCliArgs` / `specToCreateArgs`)。规格键与
  `dshp create` 的参数同形,所以「问出来的清单」能直接编译成命令行参数,不靠 agent 自己拼。
- MCP 新增 `dshp_spec` tool:传入「已收集到的规格」,返回还缺哪几步、够不够开跑,以及收齐后
  编译出的 CLI 参数与 `dshp_create_plugin` 入参。典型循环:空规格拿第一问 → 每问完一步并进规格
  再调一次 → `ready` 为 true 才生成。
- Agent skill 重写为**访谈流程**:先开放式问需求(不给选项)→ 给「走模板 vs 自己配」的建议并说明
  理由 → 模板路线列候选(相符的排最前)、自配路线先选原子(相符的排最前)再按原子追问事件域/
  界面位/缝/服务/工具名 → 逐项问存储位置、命名、配置、描述作者、轨、语言(每项可跳过)→ 收齐了
  才调 CLI 生成。全程用宿主的结构化提问功能,一次问一项。skill 另加 references/interview.md
  (清单快照 + 规格键 → CLI 参数对照表)。
- 界面位选项按 id 去重并标出该案例存在于哪几轨(此前两轨同 id 的案例在选项里会出现两次)。


- **MCP server**(`dshp mcp`,stdio 协议):把生成能力直接交给模型,三个 tool —— `dshp_list_scenarios`(一览能选什么)、`dshp_doctor`(体检本机环境)、`dshp_create_plugin`(生成插件项目,预设 / 精选案例 / 自由组合三种模式)。随本包一起发布,不另开仓库:素材、版本单源、守门测试、发布管线四样都在本仓,拆出去等于复制一份会漂移的载荷。
- tool 的入参 schema **从领域清单现生成**(原子 / 事件域 / 界面位 / 缝 / 预设 / 案例 id 全是 enum),模型在 schema 里就拿得到合法值,不会握着过期的 id 反复重试;手抄的清单必然随版本过期。
- `dshp_create_plugin` 缺省只算计划不落盘(`dryRun` 默认 true),返回将生成的文件清单;确认后用同样参数再调一次、显式传 `dryRun: false` 才写盘 —— 「显式确认后写盘」在 MCP 侧的落法。
- `dshp_create_plugin` 新增 `lang` 参数(zh / en)决定生成物语言。宿主 spawn 子进程时通常只继承 `HOME` / `PATH` / `SHELL` / `TERM` / `USER`,**不含 `LANG`**,MCP 侧因此探测不到系统语言;`dshp mcp --lang zh` 可在起服务时钉住。
- `dshp list` 子命令:一览「能选什么」—— 预设 / 精选案例 / 原子 / 事件域 / 界面位 / 能力缝 / 两轨版本配套,人读默认、`--json` 机器可读。界面位条目带宿主包、槽位键与**依赖原子**(模型据此选,选不出静默不渲染的哑界面)。清单从领域清单现取(`src/core/describe.ts`),不再靠文档快照抄一份 —— 此前这些信息散在 `domain/*` 多个清单里、没有任何出口把它们拼起来。
- Agent skill:仓内新增 `skills/dshp/`,随 npm 包一起发布。教 agent 用 dshp 生成 dsh 插件工程:选生成入口(预设 / 精选案例 / 自由组合的边界)、定轨、验证三步、宿主联调,并沉淀了一批只踩一次就会记住的坑(approve-builds 放行、cordis 双实例、typecheck 假绿、界面位必须 build + plugin add 才渲染)。
- 自由组合有了**非交互入口**:新增 `--atoms` / `--event-domains` / `--ui-surfaces` / `--service-seams` / `--new-service`,给了任一能力类参数即走自由组合路径、不进交互问卷。此前任意能力组合只能靠 agent 驱动交互问卷(逆向 clack 按键语义,一次几十次试错),或退化成「预设 + 手改」。
- `--dry-run`:打印将生成的文件清单但不落盘(「先看清再写」的入口)。

### 修复

- **界面位缺依赖原子会被静默丢弃**:自由组合路径(命令行 `--ui-surfaces` / MCP 的 `dshp_create_plugin`)可以只选界面位不选 `ui` 原子 —— 界面位实现文件与 client 聚合入口由 `ui` 原子产出,缺了它,界面位选择被无声丢掉,生成物里根本没有 `client/`,界面位一个都不渲染。交互路径因为界面位多选只在勾了 `ui` 原子时才问,天然碰不到这个坑,所以一直没暴露。现把「界面位必须配 `ui` 原子」登记进依赖表(`tool-view` 额外要 `tool`),自由组合路径会在生成前报错(`SURFACE_REQUIRES_ATOM`)。
- 生成物 README 的构建脚本放行说明此前不完整:只说了要放行 `node-pty` / `koffi` / `@deepseek-ai/dsh-subprocess-local`,对 `@google/genai` / `protobufjs` 一句「脚本是 no-op,不用批」带过 —— 但 pnpm 11 严格模式下**不把它们列进 `allowBuilds` 同样会让 install 直接失败**(不是警告),用到 llm 能力的插件(model-gateway / session-bot)在装自身依赖的第一步就装不上。现在按**装插件自身依赖**与**装宿主 CLI** 两组分别说明,并区分两类包:要真跑的三个(`node-pty` / `koffi` / `dsh-subprocess-local`,原生模块编译与 spawn helper)填 `true`;`@google/genai` / `protobufjs` 的脚本确为 no-op,**按官方 dsh 自己的口径列出来填 `false` 拒绝执行**(dsh 仓 `pnpm-workspace.yaml` 即写 `'@google/genai': false` / `protobufjs: false`,注释为「no-ops we don't need, so we deny them — install still succeeds」)。同时点明 `pnpm approve-builds` 只能写 `true`,要「拒绝执行但不让 install 失败」需手写 `pnpm-workspace.yaml` 的 `allowBuilds` 段。仓库根 README 的同一处注释与 agent skill 的放行清单同步更正。

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
