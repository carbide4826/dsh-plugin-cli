# 宿主契约与排障要点

> 面向 dsh 宿主的约束,多数是"踩过一次才记住"的。改生成物、加依赖、接宿主前先读这里。

## 版本轴语义

- `--target latest|next` 里的 `latest`/`next` 是**稳定容器名**,永不随 dsh 版本改名。
  晋升只换内容(模板树 + manifest),不换轨名。
- 轨与 manifest 严格配对:每轨一棵完整模板树 + 一份 manifest(version / cordisPeer /
  schemasteryVersion / settingsSlot 四字段),生成时零解析、零回落。
- 当前两轨同钉 dsh `0.2.0-rc.2`(快照值,以生成物 `package.json` 为准)。
- 生成物的 peer 版本必须与宿主 dsh 版本**对齐**,否则宿主门禁硬拒(见下)。

## 依赖钉版规则(最容易复发的一类事故)

**规则:凡 `@deepseek-ai/*` 运行时依赖,一律与官方 dsh 元包声明对齐(精确版本或 tilde),
不要自己写浮动 range。**

机理:浮动 range 会让安装树出现**同一包的第二个实例**。例:生成物 peer 写 `^4.0.2` 而元包精确钉
`4.0.2`,pnpm 可能给 client-ui 包绑一个游离的 `4.0.4` 实例;`declare module` 合并进的是 4.0.4 的
`Context`,而类型检查读的是另一个 → `ctx.slots` 报 `TS2339`。

同款病灶在 schemastery 上更隐蔽:元包精确钉 `3.18.2`、案例写 `^3.18.2` 漂到 `3.18.4`,
`Config` schema 类型劈叉 → webhook 场景的 port schema 直接 typecheck 红。

实测过的两个方向:

- 官方全家是**精确钉**(`cordis 4.0.2` / `schemastery 3.18.2` / `loader 1.0.3` / `hmr 1.0.17` /
  `timer 1.1.4` / `include 1.0.7`);dsh `0.2.0-rc.2` 一线改 tilde(`~4.0.4` / `~3.18.4`)。
- 模板的 `pnpm-workspace.yaml` 里**不要**写 overrides 去钉这些包 —— 官方元包自己已精确钉,
  加 overrides 反而制造与官方声明不一致的第二实例。

改依赖后先核对安装树只有单实例,再谈 typecheck 绿不绿。

## typecheck 假绿(静默失效)

类型来源包(`dsh-client-ui-slots` / `dsh-client-ui-chat` / `dsh-client-ui-conversation`)可能不在
生成项目的 node_modules 里 —— 类型解析有时靠上层目录恰好装了 dsh。此时 `tsc` 的 `skipLibCheck`
会吞掉解析失败,类型退化成 `any`,于是 **typecheck 假绿**:旧错误代码照样"通过"。

所以:typecheck 只在**依赖装全的干净环境**里算数。CI 里跑生成工程的 typecheck 也一样,
干净 runner 反而是最早暴露问题的地方。

## 0.1.7 起的契约变化

| 变化 | 影响 | 现行写法 |
| --- | --- | --- |
| `settings.plugin.item` 槽键全仓删除 | 设置卡片原入口失效 | 改用 `settings.plugins.tab`(Plugins 页签槽):`ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({name, id, order, label}, Component))`;槽型声明在 `dsh-client-ui-settings` 包 |
| `installSection` 移除 | 动态配置没有旧接线了 | 改用模块 `Config` 导出,由宿主原生投影成表单;要热更新的字段走 `.volatile()` 链(保存 → 写 profile patch → 重跑 apply) |
| `MessageSourceMap` 共享 `'plugin'` kind 删除 | 插件产的消息没有归属 kind | 插件在自己的模块 `declare module` 声明自有 kind(官方 webhook 声明 `'webhook'` 同款),生成物用 `'plugin-notice'` |

## 宿主门禁(插件 add / 加载)

- 门禁**只查 peerDependencies 里的 `dsh` / `dsh-*` 条目**,cordis、schemastery 不参与。
- 判定用 `semver.satisfies(..., includePrerelease)`;不满足即**硬拒**:`add` 预检阶段就拒绝,
  加载时再 throw。
- ⚠️ **上游 dist-tag 会滚,而本仓两轨的 manifest 不会自动跟**(canary 只报警不动作,规则见
  `docs/UPSTREAM-VERSION-POLICY.md`)。实测(2026-10-20):npm 上 `latest`/`next` 已是 `0.2.1-rc.2`
  (cordis `~4.0.5`),而两轨 manifest 仍钉 `0.2.0-rc.2`(cordis `~4.0.4`)。
  **后果**:生成物 peer 钉 `0.2.0-rc.2`,装在 `0.2.1-rc.2` 的宿主上会被门禁硬拒
  (`0.2.1-rc.2` 不满足 peer `0.2.0-rc.2`)。所以装宿主一律**以生成物 package.json 的钉版为准**,
  别裸装 `latest`。
- 豁免:`dsh plugin allow-version` 做精确配对。
- ⚠️ **裁决方是跑 `add` 命令的那个项目里的 dsh CLI 的版本**,不是被测项目的版本 ——
  别在被测项目目录里跑 add 来判断宿主行为。
- peer 区间跨 prerelease 有坑:npm semver 同 tuple 规则下 `>=0.1.5-rc.2` **匹配不到**
  `0.1.7-rc.2`,要覆盖多代 prerelease 得用 OR 区间。

## 工具链行为(pnpm)

- pnpm 11 默认 `strict-dep-builds: true`:被跳过的依赖构建脚本**直接抛 `IgnoredBuildsError`
  让 install 失败**,不是警告。
- pnpm 11 用 `allowBuilds`(实测其 bundle 里 `allowBuilds` 出现 75 次、`onlyBuiltDependencies`
  仅 6 次);待决项由 pnpm 写进项目的 `pnpm-workspace.yaml`,值填 `true` 才放行,填 `false`
  也放行但原生模块不会编译。
- 默认 `auto-install-peers: true`:peer 依赖会被自动装上 —— 但本仓产物把版本精确钉死,
  lockfile 里不会浮动,**别手动改成 `^`**(会同时撞上宿主 peer 门禁)。

## 发布元信息(宿主插件管理页要读)

宿主按 npm 包身份聚合各包的 client 出口并读包内元信息:

- `package.json` 的 `icon`(包内相对路径,≤256KiB SVG)→ 详情页大图标。
- `locale/<lang>.json` 的 `meta`(名称/介绍,双语)→ 详情页文案;无字典回落 package.json 原文,en 兜底强制。
- `exports` 必须能解析 `"./package.json"` 与 `"./locale/*.json"`,否则元信息管线整体回落。
- `files` 白名单要显式列 `dist` 等产物,否则 npm 回落到 `.gitignore` 当黑名单,产物漏发。
- 宿主会读宿主自身语言对应的那份 locale 字典,不是 agent 的语言。

## 真机验证口径

- dsh CLI 认 `DSH_HOME` 环境变量重定位 profile 根 —— 做隔离验证时用临时 home,
  不要碰用户真实 profile(它可能有 bundle 与 settings.yaml 缺失之类的问题会卡住启动)。
- 顶层裸 `dsh` 需要显式 `--profile`;`dsh web` 子命令带位置参数即可:
  `pnpm dsh web --patch ./dev.patch.yml --dump-config`。
- **组合树加载成功的判据**:`--dump-config` 输出里含本插件条目(grep 插件 id)。
- UI 侧判据:浏览器里 Web UI 渲染出对应界面位 + console 无报错。
  - 界面位必须 `pnpm build` + `pnpm dsh plugin --profile web add .`;`--patch` 直载没有包身份,
    浏览器侧槽位不注册。
  - 杀上一个服务后残留页面的 WebSocket/SSE 重连会在 console 里报 `ERR_CONNECTION_REFUSED`,
    污染下一轮判定 —— 先把旧页面切走再挂监听。

## 身份三同值

目录名、`package.json` 的 `name`、`src/index.ts` 的 `export const name` 默认同值;
`cordis.patch.yml` 的 `- id:`(插件 id)与 `name:`(模块名)也要同步;UI 案例另有
`tsdown.config.ts` 内的 client id。漏一处即身份错位。经 `dshp create` 生成时已自动重写,
但**改名要三处一起改**,别只改一处。
