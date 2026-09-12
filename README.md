# create-dsh-plugin-cli

交互式脚手架 CLI,一键搭建 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh`)插件项目骨架。

- npm 包名:`create-dsh-plugin-cli`,bin 命令:`dshp`
- 设计依据:`dsh-plugin-structure-spec.md` + `dsh-plugin-cli-design.md`(见 default workspace,随项目进展迁入仓库)

## 开发

```sh
pnpm install          # 安装依赖
pnpm build            # 构建(输出 dist/cli.js)
pnpm dev              # 构建并监听变更
pnpm typecheck        # 类型检查
pnpm test             # vitest
node dist/cli.js --help   # 本地验证 bin
```

## 用法(规划中)

```sh
npm create dsh-plugin-cli          # 零安装启动
dshp create my-plugin              # 交互式生成插件骨架
```
