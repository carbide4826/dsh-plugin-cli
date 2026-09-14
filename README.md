# create-dsh-plugin-cli

交互式脚手架 CLI,一键搭建 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh`)插件项目骨架。

- npm 包名:`create-dsh-plugin-cli`,bin 命令:`dshp`
- 设计依据:`dsh-plugin-structure-spec.md` + `dsh-plugin-cli-design.md`(见 default workspace,随项目进展迁入仓库)

## 开发

```sh
pnpm install          # 安装依赖
pnpm build            # 构建(输出 dist/cli.mjs)
pnpm dev              # 构建并监听变更
pnpm typecheck        # 类型检查
pnpm test             # vitest
node dist/cli.mjs --help   # 本地验证 bin
```

## 用法

```sh
npm create dsh-plugin-cli          # 零安装启动
dshp create my-plugin              # 交互式问卷生成插件骨架
```

### 场景快捷生成(非交互,一行命令)

```sh
dshp create my-tool --template tool    # 指定目录名生成
dshp create --template llm             # 不给目录名时用场景默认名(如 my-llm)

# 覆盖字段:传了用传的,没传回落场景预设/推导值
dshp create my-llm --template llm --pkg-position library --author carbide --description "LLM adapter 示例"
```

- 可用场景:`tool`(工具示例,toolName=example_tool)/ `llm`(service + llm 缝)/ `ui`(settings-card 界面,静态配置)/ `events`(session 域事件监听)/ `protocol`(HTTP 协议端点)
- 生成后与交互式相同:`pnpm install → pnpm build`,本地调试 `dsh web --patch ./dev.patch.yml`
- 场景一览也可 `dshp create --help` 查看;`--template` 的自定义模板源(local path / git URL / npm 包)暂未支持

- 可覆盖参数仅在预设组合模式生效(见下表);非法取值与未知参数会报错并列出可用项
- 约束:ui 场景(含 settings-card)不可 `--config none`

可覆盖参数(仅预设组合模式):

| 参数 | 取值 | 未提供时的默认 |
|---|---|---|
| `--pkg-name <name>` | npm 包名 | 目录名推导 |
| `--plugin-id <id>` | 插件 id | 目录名推导 |
| `--tool-name <name>` | 工具名 | 场景预设(`example_tool`) |
| `--description <text>` | 文本 | 场景预设文案 |
| `--author <name>` | 文本 | 空 |
| `--pkg-position <position>` | `bundle` / `library` | `bundle` |
| `--config <mode>` | `none` / `static` / `dynamic` | 场景预设(ui 场景为 `static`) |

### 精选案例(`-s`,整目录拷贝真实可执行案例)

```sh
dshp create my-tool --template quick-tool -s   # 拷贝精选案例,身份重写为 my-tool
dshp create --template model-gateway -s        # 不给目录名时用案例 id 作目录名
```

- 案例一览(详见 `dshp create --help` 或 `templates/scenarios/README.md`):
  `quick-tool`(查询工具+结果卡片)/ `model-gateway`(自有模型网关+动态设置)/ `session-bot`(会话自动响应)/ `webhook-bridge`(外部事件桥接)/ `notebook`(用户数据存取)
- 案例是**人工维护的完整工程**,所见即所得:覆盖参数不适用,项目身份(包名/插件 id/patch id)随目录名重写



