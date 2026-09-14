# scenarios/ — 精选案例库(金样)

本目录是 `dshp create <name> --template <案例> -s` 的取材处:每个子目录是一个**真实可执行的完整插件工程**,演示一种典型场景的组合用法。

## 与预设组合(--template 不带 -s)的区别

| | 预设组合(默认) | 精选案例(-s) |
|---|---|---|
| 来源 | 预设表(`src/domain/scenarios.ts`)→ 原子管线实时生成 | 本目录整目录拷贝 |
| 内容 | 最小合规骨架 | 按真实场景组合、带轻量业务与讲解 |
| 维护 | 只改预设表 | 本目录人工维护 |

## 案例一览

| 案例 | 场景 | 组合 |
|---|---|---|
| `quick-tool` | 自定义查询工具 + 结果卡片 | tool + tool-view |
| `model-gateway` | 接入自有模型服务 | llm 缝 + 设置卡片(动态配置) |
| `session-bot` | 监听会话自动响应 | events + llm 缝 |
| `webhook-bridge` | 外部事件桥接进会话 | protocol + events |
| `notebook` | 用户数据存取 | storage 缝 + tool |

## 维护约定

- 案例身份(目录名 = package.json name = 插件 id = patch id)必须四处一致——拷贝时按目录名做整库替换,改名同步改四处。
- 每个案例 README 的开头三段(演示什么 / 关键文件导览 / 如何验证起效)是固定结构,业务再重也要保留。
- 业务逻辑保持轻:案例的价值是"能跑通注入与起效的最小真实形态",不是业务模板。
- 新增案例后同步:`src/cli.ts` help 文案的案例一览 + CLI README + 本表。
- 案例内不允许出现 `dev.patch.yml` / `node_modules/` / `dist/`(结构测试会拦)。
