# 参考例子(golden set)

> 这里放**完整的访谈实录**:需求 → 逐项问答 → 收集到的规格 → 编译出的命令 → 验证。
> 用来当样板模仿,不是规则 —— 提问怎么措辞、一次问几项、用什么工具问,都可以按你所在应用调整。
>
> ⭐ 每个案例都带一份**可执行的规格**(JSON)与**编译出的命令**。守门测试
> (`src/core/skillGolden.test.ts`)会拿这份规格去跑编译器(`specToCliArgs`)，
> 再跟文中写的命令逐字比对 —— **例子与编译器对不上就会红**。
> 所以这里的命令是「真跑得出来的」,不是示意。

## 提问形态:三种可选姿态

skill 只规定语义(逐项确认、每项能单独跳过、建议要给理由、收齐才动手),**不规定工具**。
下面是三种都成立的姿态,挑你所在应用支持的那种:

**形态 A · 普通对话,一次一项**(最通用,任何应用都能用)

```
你:这个插件要做什么?
用户:查订单。
你:走现成模板还是自己配能力组合?
  推荐「走模板」—— quick-tool 就是「自定义查询工具 + 结果卡片」,和你的需求对得上。
用户:走模板。
你:用哪个模板?
  1. quick-tool(推荐:查订单正是它)
  2. notebook     3. model-gateway
用户:第一个。
你:工程放在哪、叫什么?(可以跳过,默认 my-orders)
用户:my-orders,其余你定。
```

**形态 B · 结构化问卷**(应用有结构化提问能力时用:比如带「跳过」选项的问卷工具;
一次列若干项,每项自带「跳过」)

```
[多选] 要勾哪些能力原子?
  □ tool    暴露工具(推荐 —— 你要对外提供查询能力)
  □ ui      宿主界面位(推荐 —— 你要在会话里展示结果)
  □ events  订阅宿主事件
  □ service 扩展能力缝
  □ protocol 提供 HTTP 端点
  [跳过此问]

[文本] 工具叫什么名字?
  预设:query_orders
  [跳过此问]
```

**形态 C · 一次列一批,让用户回一句**(效率高;「逐项可跳过」的语义不变)

```
你这几项定一下(没说的按默认来,可跳过):
  1. 目录名(默认 my-orders):______
  2. 包名(默认与插件 id 同值):______
  3. 插件 id(默认与目录名同值):______
  4. 描述(默认预设值):______
  5. 作者(默认空):______
  6. 目标轨(默认 latest):______
  7. 生成物语言(默认按环境探测):______
```

三种姿态的共同点只有三条:**逐项确认 · 每项能单独跳过 · 跳过的项要能说出用了什么默认**。

---

## 案例 1 · 模板路线 · 精选案例 quick-tool

**用户**:「帮我起一个能查订单的 dsh 插件工程」

**提问形态**:A(普通对话,一次一项)

**访谈片段**:

> 你:这个插件要做什么?
> 用户:查订单。
> 你:走现成模板还是自己配能力组合?
>   推荐**走模板** —— `quick-tool` 就是「自定义查询工具 + 结果卡片」,你要的正是这个。
>   自己配也能做,但目录、界面位这些都得一项项定。
> 用户:走模板。
> 你:用哪个模板?(与需求相符的排最前)
>   推荐 `quick-tool` —— 自定义查询工具 + 结果卡片。
>   其余:`model-gateway`(接自有模型服务)、`webhook-bridge`(外部事件桥接进会话)、
>   `notebook`(用户数据存取)、`session-bot`(监听会话自动响应)。
> 用户:quick-tool。
> 你:工程放在哪、叫什么?(跳过 = 当前目录下的默认名 my-orders)
> 用户:my-orders,其余你定。
> 你:生成物用哪种语言?(跳过 = 按环境探测)
> 用户:中文。

**收集到的规格**:

```json
{
  "need": "查订单",
  "route": "template",
  "template": "quick-tool",
  "templateKind": "case",
  "dirName": "my-orders",
  "lang": "zh",
  "skipped": ["pkgName", "pluginId", "description", "author", "pkgPosition", "target"]
}
```

**编译出的命令**:

```sh
dshp create -s --template quick-tool my-orders --lang zh
```

**验证**:`cd my-orders && pnpm install && pnpm typecheck && pnpm build`,
再 `pnpm dsh web --patch ./dev.patch.yml`(冒烟看组合树里有没有本插件行)。

⚠️ 跳过的项 = 交给默认值:包名与插件 id 同值、插件 id 与目录名同值、描述用案例默认、
作者空、目标轨 `latest`。汇报时要把这句说清。

---

## 案例 2 · 模板路线 · next 轨的 webhook-bridge

**用户**:「用 next 轨起一个接外部 webhook 的插件」

**提问形态**:A

**访谈片段**:

> 你:这个插件要做什么?
> 用户:接外部 webhook,进来后能在会话里看到。
> 你:走现成模板还是自己配?
>   推荐**走模板** —— `webhook-bridge` 案例正是「外部事件桥接进会话」。
> 用户:走模板,next 轨。
> 你:用哪个模板?
>   推荐 `webhook-bridge`(next 轨配套 dsh 0.2.1-rc.2)。
> 用户:就它。
> 你:工程放在哪、叫什么?
> 用户:my-hook,其余你定。

**收集到的规格**:

```json
{
  "need": "接外部 webhook,进来后能在会话里看到",
  "route": "template",
  "template": "webhook-bridge",
  "templateKind": "case",
  "dirName": "my-hook",
  "target": "next",
  "lang": "zh",
  "skipped": ["pkgName", "pluginId", "description", "author", "pkgPosition"]
}
```

**编译出的命令**:

```sh
dshp create -s --template webhook-bridge my-hook --target next --lang zh
```

**验证**:同案例 1;报告时点明 next 轨钉的 dsh 版本(**取自生成物 package.json**,别凭记忆)。

---

## 案例 3 · 自配路线 · 工具 + 设置卡片

**用户**:「我要一个能在设置页配 API Key、并在会话里显示查询结果的插件」

**提问形态**:B(结构化问卷)

**访谈片段**:

> 你:这个插件要做什么?
> 用户:设置页配 API Key,查到的结果显示在会话里。
> 你:走现成模板还是自己配?
>   推荐**自己配** —— 现成案例都不合(没有「设置页配密钥」这种形态),
>   而你要的组合(设置卡片 + 工具 + 结果展示)正好能一次配齐。
> 用户:自己配。
> 你:[多选] 要勾哪些能力原子?
>   推荐 `tool`(结果得有个工具去查)+ `ui`(设置页与结果展示都是界面位,由它产出)。
>   其余:`events`、`service`、`protocol`。
> 用户:tool 和 ui。
> 你:[多选] 挂哪些宿主界面位?
>   推荐 `settings-card`(就是设置页)+ `tool-view`(工具结果的展示位)。
>   其余:`chat-node`、`input-dock`、`sidebar`、`session-header`。
> 用户:这两个。
> 你:[文本] 工具叫什么名字?
> 用户:query_api_keys。
> 你:[单选] 配置方式?(有 settings-card 时不能选 none)
>   `dynamic`(用户在设置页改配置,保存后热更新)/ `static`(配置写死在包里)。
> 用户:dynamic。
> 你:工程放在哪、叫什么?
> 用户:my-api-keys,其余你定。

**收集到的规格**:

```json
{
  "need": "在设置页配 API Key,查到的结果显示在会话里",
  "route": "custom",
  "atoms": ["tool", "ui"],
  "uiSurfaces": ["settings-card", "tool-view"],
  "toolName": "query_api_keys",
  "config": "dynamic",
  "dirName": "my-api-keys",
  "lang": "zh",
  "skipped": ["pkgName", "pluginId", "description", "author", "pkgPosition", "target"]
}
```

**编译出的命令**:

```sh
dshp create --atoms tool,ui --ui-surfaces settings-card,tool-view --tool-name query_api_keys --config dynamic my-api-keys --lang zh
```

**验证**:`cd my-api-keys && pnpm install && pnpm typecheck && pnpm build`。

⭐ **含界面位 ⇒ 启动要走 `pnpm dsh plugin --profile web add .` 再 `pnpm dsh web`**;
`--patch` 直载没有 npm 包身份,浏览器侧槽位不注册,界面位会静默不渲染。

---

## 案例 4 · 自配路线 · 事件订阅 + HTTP 端点(零界面位)

**用户**:「我要监听会话事件,并且给外部系统一个 HTTP 回调端点」

**提问形态**:C(一次列一批)

**访谈片段**:

> 你:这个插件要做什么?
> 用户:监听会话事件,再给外部系统一个 HTTP 回调端点。
> 你:走现成模板还是自己配?
>   推荐**自己配** —— `webhook-bridge` 案例偏「接外部事件进会话」,
>   你要的是「会话事件 → 主动回调外部」,方向相反,得自己配。
> 用户:自己配。
> 你:[多选] 要勾哪些能力原子?
>   推荐 `events`(订阅宿主事件)+ `protocol`(提供 HTTP 端点)。
> 用户:这两个。
> 你:[多选] 订阅哪些事件域?
>   推荐 `session`(会话生命周期)+ `tools`(工具调用)。
>   其余:`agent`、`approval`、`fs`、`settings`。
> 用户:session 和 tools。
> 你:你这几项定一下(没说的按默认来,可跳过):
>   1. 目录名(默认 my-plugin):my-listener
>   2. 目标轨(默认 latest):next
>   3. 生成物语言(默认按环境探测):跳过
> 用户:就这些。

**收集到的规格**:

```json
{
  "need": "监听会话事件,并给外部系统一个 HTTP 回调端点",
  "route": "custom",
  "atoms": ["events", "protocol"],
  "eventDomains": ["session", "tools"],
  "dirName": "my-listener",
  "target": "next",
  "skipped": [
    "surfaces",
    "seams",
    "newService",
    "toolName",
    "config",
    "pkgName",
    "pluginId",
    "description",
    "author",
    "pkgPosition",
    "lang"
  ]
}
```

**编译出的命令**:

```sh
dshp create --atoms events,protocol --event-domains session,tools my-listener --target next
```

**验证**:`cd my-listener && pnpm install && pnpm typecheck && pnpm build`。

注意:没勾 `ui` 就**没有界面位**、生成物里没有 `client/` —— 这是对的,不是缺了。

---

## 案例 5 · 自配路线 · 一个能力都不选(纯骨架)

**用户**:「先起个空骨架我看看长什么样」

**提问形态**:A

**访谈片段**:

> 你:这个插件要做什么?
> 用户:先起个空骨架看看。
> 你:走现成模板还是自己配?
>   推荐**自己配**(不选任何能力原子)—— 模板都带能力,纯骨架只能自己配。
> 用户:好。
> 你:[多选] 要勾哪些能力原子?
>   都不勾也行(纯骨架)。
> 用户:都不勾。
> 你:工程放在哪、叫什么?
> 用户:my-skeleton,其余你定。

**收集到的规格**:

```json
{
  "need": "先起个空骨架看看",
  "route": "custom",
  "atoms": [],
  "dirName": "my-skeleton",
  "skipped": [
    "domains",
    "surfaces",
    "seams",
    "newService",
    "toolName",
    "config",
    "pkgName",
    "pluginId",
    "description",
    "author",
    "pkgPosition",
    "target",
    "lang"
  ]
}
```

**编译出的命令**:

```sh
dshp create --atoms "" my-skeleton
```

**验证**:`cd my-skeleton && pnpm install && pnpm typecheck && pnpm build`。

⚠️ **零原子时 `--atoms ""` 也要给** —— 空值仍是非交互路径,不给会落进 CLI 的交互问卷
(脚本里没人能答)。这正是编译器固定产出 `--atoms` 的原因,照抄编译结果就不会错。
