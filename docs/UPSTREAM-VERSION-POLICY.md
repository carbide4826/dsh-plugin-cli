# dsh 宿主版本跟进规则(内部文档)

> 本文档是开发者纪律,不是 npm 包用户需要知道的信息(不随包发布)。
> 机制侧:版本唯一权威在 `src/domain/dsh-manifest.ts`;守门测试在 `src/generate/versionGuard.test.ts`。
> 定稿:2026-09-22。

## 为什么需要规则

- dsh 处于 pre-release 期,**semver 语义不可信**(`0.1.6-alpha` 也可能 breaking),判断不能建立在版本号语义上
- 基座小版本滚动可能带来子包增删改名,盲目跟进会追着官方 bug 跑
- 破坏性变更值不值得跟是业务判断,必须人工拍板

## 两层规则

### 第一层:小版本(非破坏)——一般场景

- **判据**:major/minor 位都没变(只是 rc/alpha 后缀滚动)**且**升版后 CI 绿(E2E 生成→install→typecheck→build)
- **动作**:只改 `dsh-manifest.ts` 的 `version` 一行,零业务源码改动
- **滞后条件(硬性)**:不马上跟进。官方在同一版本线上**再迭代 ≥3 次**后才升。差值以 npm registry 的发布序列计(见下),不做 semver 距离计算

### 第二层:大版本 / 破坏性变更

- **判据**:出现任一——
  - major 或 minor 位与钉住版本不同(哪怕 CI 绿,强制走本层)
  - CI 红(install/typecheck/build 任一失败)
  - 官方明确标注 breaking
- **动作**:**不直接改**。先出分析报告(红在哪 / 影响哪些模板与案例 / knownDshPackages 对照新版有哪些子包被删改名 / 改动面估计)→ 开发者人工拍板 → 拍板后才动。报告做完即归档,不长期维护

## 判定速查表

| 情形 | 判据 | 走哪层 |
|---|---|---|
| 位没变,预发布后缀在滚 | 前两段相同 + registry 序列差 ≥3 + CI 绿 | 第一层 |
| minor 位变了(0.1.x→0.2.x) | 版本字符串拆段比较 | **强制**第二层 |
| major 位变了(0.x→1.x) | 同上 | **强制**第二层 |
| 位没变但 CI 红 | CI | 第二层 |

## 差值怎么算(应对非纯 x.x.x 版本号)

dsh 版本形态混杂(`0.1.5-rc.2` / `0.1.6-alpha.2`),**不用 semver 解析,用 registry 发布序列**:

```sh
npm view @deepseek-ai/dsh versions --json   # 按发布顺序的数组
```

在数组里定位钉住版本,数它后面还有几个 = 差值。发布序列按时间天然全序,rc/alpha 混排不乱。金丝雀 job 的差值输出即按此实现。

## manifest 更新 SOP(仅第一层适用,五步)

触发时机:金丝雀报「差值 ≥3 且绿」,或人工确认。

1. `npm view @deepseek-ai/dsh@<新版> …` 核对子包集合:对照 `knownDshPackages`,确认新版下没有子包被删/改名(新增不影响)
2. 改 `dsh-manifest.ts` 的 `version` 一行(knownPackages 为求并构造,通常无需动)
3. push → CI 全绿(8 条守门测试自动验证跟随性,E2E 用新版本真装真构建)
4. CHANGELOG 记一行版本跟随
5. 完事。**全程不改任何业务源码**——这是本层的验收标准

## 金丝雀 job(哨兵,自动化的只有发现)

- `.github/workflows/canary.yml`,每周一定时 + 可手动触发
- 动作:取官方最新 dist-tag 版本 → 生成工程并把版本改写为最新版 → install/typecheck/build
- 输出:官方最新 vs 钉住版本的差值
- **红 = 报警,不改任何东西,不阻塞主线 CI**——它只在喊「下次升版有障碍」或「升级窗口已开,等口令」
- 升级扣扳机永远是人工:金丝雀绿 + 差值 ≥3 → 由开发者执行上面五步

## 边界声明(防范围蔓延)

- 只跟进**模板引用到的**子包与 API;官方新增但未用的能力(新槽位/新事件域)不主动追,进候选清单等里程碑决策
- 本文件不进 npm 包(files 白名单只含 `docs/dsh-command-builder.html`)
