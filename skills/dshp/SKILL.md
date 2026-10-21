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

## Inputs to collect

生成前确认这几项(缺省值可用,但要心里有数):

- **插件要做什么** —— 决定走预设还是精选案例(见 Procedure 第 1 步)。
- **目录名** —— 生成位置。目录已存在会直接失败(退出码 1),不要先占位再生成。
- **是否含界面位(UI)** —— 含 UI 的插件必须 `build` + `plugin add` 才渲染,`--patch` 直载只加载 host 半边。
- **宿主版本轴** —— `--target latest|next`,语义见 references/host-contracts.md。
- **插件 id / 包名** —— 默认与目录名同值;要改就生成时显式给 `--plugin-id` / `--pkg-name`。

## Procedure

### 1. 选生成入口(三条路,选错会拿到不对的骨架)

| 入口 | 命令形态 | 产物 |
| --- | --- | --- |
| 预设组合 | `dshp create <dir> --template <preset>` | 能力组合被预设锁定的骨架 |
| 精选案例 | `dshp create <dir> --template <case> -s` | 真实工程整目录拷贝,身份已重写 |
| 自由原子组合 | `dshp create <dir> --atoms <list> [--ui-surfaces <list>]` | 任意勾选原子/事件域/界面位/缝,**非交互** |

决策顺序:用户描述贴近某个案例的形态 → 用精选案例;只是要个最小骨架 → 用预设;
要精确的能力组合 → 用自由组合入口。

⭐ **自由原子组合已有原生非交互入口**(2026-10-21 起):

```sh
dshp create <dir> --atoms tool,ui --ui-surfaces settings-card --config dynamic \
  --tool-name query_orders --target next
```

能力类 flag:`--atoms` / `--event-domains` / `--ui-surfaces` / `--service-seams`(逗号分隔)
/ `--new-service`。给了任一能力类 flag 就走这条路径,不进问卷;硬约束由 CLI 校验并以稳定
错误码报错(未知 id / 界面位缺原子 / settings-card 配 config=none)。

需求超出单个预设/案例时,三条路,按成本排序:

1. **自由组合 flag**(推荐,最快)。上面那条命令直接产出**纯生成器产物**(零手改):
   ```sh
   node scripts/drive-questionnaire.mjs --dir my-orders --target next \
     --atoms tool,ui --surfaces settings-card --tool-name query_orders
   ```
   脚本是 CLI 原生入口的薄壳(参数校验 + 生成后自检 + JSON 摘要),旧参数面保持兼容;
   直接调 CLI 也一样,脚本多给一个「按勾选推应有的文件并自检,缺文件即非零退出」。
2. **最接近的预设/案例 + 手改**。挑手改面最小的一侧作底座:原子一般只值 1 个文件
   (`src/tool.ts`),界面位则要动 4 个文件 + 聚合入口 + 依赖 + exports + client 出口 ——
   底座选错了手改量差一个量级。手改时**不要凭记忆写生成器的接线**:另生成一份同轨的另一个
   预设工程当参照,逐字取它的 `inject` / import / call 形态与 peer 钉版,用完删掉。
3. **让用户自己跑交互式** `dshp create`。最省你的时间,代价是要用户在场。

> 历史上自由组合只能靠驱动交互问卷(逆向 clack 按键语义,几十次试错)。**那套做法已经退役** ——
> 现在有原生 flag,别再去逆向按键语义,也别绕道手改生成器接线。

案例与预设的实时清单见 references/cli-surface.md。

### 2. 生成

```sh
npx create-dsh-plugin-cli create <dir> --template <preset|case> -s? --target <latest|next> --lang <zh|en>
```

- `-s` 必须配 `--template`,单独给会报错退出。
- `--lang` 决定生成物 README/locale 的语言(生成物单语言交付);用户用中文提问就用 `zh`。
- 描述与作者在生成时就给上(`--description` / `--author`):事后手改 package.json 与 locale
  两处,不如一次给对;不给出的话描述会落回预设默认值。
- 身份默认三处同值:目录名 = `package.json` 的 `name` = `src/index.ts` 的 `export const name`。
  精选案例会把全树的案例 id 按词边界替换成插件 id,不用手改。

### 3. 验证三步(不能跳,跳了等于没验)

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

### 4. 装宿主并联调

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

### 5. 报告

告诉用户:生成了什么(目录 + 用了哪个预设/案例 + 哪条轨)、验证跑到哪一步(装依赖/类型/构建/
组合树)、接下来怎么启动。若某步没跑成,明确说是哪一步、为什么。

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
| 启动时端口占用 / 别的插件串进来 | `web` profile 是共用的 | 换自己命名的 profile 隔离 |

排障细节(契约变化、依赖钉版规则、门禁语义)见 references/host-contracts.md。

## 事实核对纪律

本 skill 与两份 reference 里的版本号、槽位键、包名都是**快照**,会随上游滚动失效。涉及
「宿主现在是什么行为」的判断,别只信快照 —— 直接读源头,成本不高:

- **能选什么**:`dshp list`(人读)/ `dshp list --json`(机器读)—— 权威实时清单,
  预设/案例/原子/事件域/界面位/缝/两轨版本配套一次给全,别从本 skill 的快照里抄。
- 宿主契约与槽位定义:`dsh-fork` 仓库的 `packages/client/**/slot-contract.ts`、
  `packages/boot/app-boot/src/plugin-compatibility.ts`(门控规则)。
- 依赖配套:`npm view @deepseek-ai/dsh@<版本> dependencies`。
- 工具链行为:本机 pnpm 的实现(比如 `allowBuilds` 与 `onlyBuiltDependencies` 的实际生效项)。

快照过期时以你当场读到的为准,并把差异写进给用户的答复里。

## Examples

Input:「帮我起一个能查订单的 dsh 插件工程」
Output: 走精选案例 `quick-tool`(tool + tool-view 结果卡片),生成 `my-orders` 目录,
`pnpm install && pnpm typecheck && pnpm build` 三步跑通后,报告生成的目录与启动命令
(`pnpm dsh web --patch ./dev.patch.yml`;若要做设置卡片则再 `plugin add`)。

Input:「用 next 轨起一个接外部 webhook 的插件」
Output: `dshp create my-hook --template webhook-bridge -s --target next --lang zh`,
再按第 3、4 步验证;报告时点明 next 轨当前钉的 dsh 版本(取自生成物 package.json)。

## Windows (win32) platform notes

仓库只在 macOS/Linux 上实测过,Windows 未验证。命令等价:

- `grep` 不可用 → 用 `findstr /C:"<plugin-id>"`,或直接看 `--dump-config` 全量输出。
- `pnpm approve-builds` 交互在 Windows 同样可用;不能交互时改 `pnpm-workspace.yaml` 的
  `onlyBuiltDependencies` / `allowBuilds` 白名单直接放行。
- 路径分隔符差异不影响本 skill 的步骤(生成器自己拼路径),但 `dev.patch.yml` 里的绝对路径
  是 Windows 风格,手工编辑时注意。
