// 中文字典(zh 为字典结构的事实标准,en 在类型层 satisfies 本文件的结构)
export const zh = {
    common: {
        cancelled: "已取消",
    },
    cli: {
        intro: "dshp · DSH 插件骨架生成",
        introCase: "dshp · 精选案例:{name}",
        introPreset: "dshp · 场景快捷生成:{id}({label})",
        warnOverride:
            "覆盖类参数(--pkg-name/--config 等)仅在配合 --template 时生效,本次已忽略",
        warnCaseInapplicable:
            "精选案例所见即所得,以下覆盖参数不适用,已忽略:{flags}",
        warnToolNameIgnored:
            "--tool-name 已设置,但当前场景不含 tool 原子,该值不会出现在生成物中",
        errScenarioNeedsTemplate:
            "--scenario(-s)需与 --template <案例id> 搭配使用(详见 dshp create --help)",
        errCaseNotFound:
            '案例 "{name}" 不存在。可用案例:{cases}(详见 dshp create --help)',
        errUnknownScenario:
            '未知场景 "{name}"。可用场景:{ids}(详见 dshp create --help)',
        errCheckFailed: "参数校验失败",
        startMessage: "从哪里开始?",
        startCase: "精选案例",
        startCaseHint: "完整工程直接拷贝,开箱即跑",
        startAtoms: "原子组合",
        startAtomsHint: "按能力勾选,拼装最小骨架",
        caseSelect: "选择精选案例",
        cancelledNoFiles: "已取消,未生成任何文件。",
        dirExists: "目录已存在:{dir}(换一个目录名,或删除后重试)",
        copied: "已拷贝 {n} 个文件 → {dir}(项目身份重写为 {name})",
        generated: "已生成 {n} 个文件 → {dir}",
        fileList: "文件清单",
        confirmGenerate: "按以上答案生成项目?",
        caseHints: {
            "quick-tool": "查询工具+结果卡片",
            "model-gateway": "自有模型网关+动态设置",
            "session-bot": "会话自动响应",
            "webhook-bridge": "外部事件桥接",
            notebook: "用户数据存取",
        },
        helpBody: `场景快捷生成(--template 有两个来源,用 -s 区分):

1) 预设组合(默认):
   dshp create <name> --template <preset>
   dshp create --template <preset>

   预设一览:
     tool       工具示例(tool 原子,toolName=example_tool)
     llm        LLM 服务示例(service + llm 缝)
     ui         界面示例(settings-card,静态配置)
     events     事件监听示例(session 域)
     protocol   HTTP 协议示例(protocol 原子)

2) 精选案例(-s):
   dshp create <name> --template <case> -s

   案例:
     quick-tool      自定义查询工具 + 结果卡片(tool + tool-view)
     model-gateway   接入自有模型服务(llm 缝 + 设置卡片动态配置)
     session-bot     监听会话自动响应(events + llm 缝)
     webhook-bridge  外部事件桥接进会话(protocol + events)
     notebook        用户数据存取(storage 缝 + tool)

参数配置:
  --pkg-name <name>          npm 包名
  --plugin-id <id>           插件 id
  --tool-name <name>         工具名(tool 场景)
  --description <text>       描述
  --author <name>            作者
  --pkg-position <position>  bundle | library
  --config <mode>            none | static | dynamic

语言:
  --lang <lang>              zh | en(缺省自动检测 LANG)`,
    },
    prompts: {
        basic: {
            dirTitle: "项目目录 Project directory",
            cwdValid: "使用当前目录,插件 id 默认参考文件夹名 {name}",
            cwdInvalid:
                "当前文件夹名 {name} 不含可用英文字符,插件 id 请自行填写",
            description: "一句话描述(可空,直接回车跳过)",
            author: "作者(可空,直接回车跳过)",
            pkgTitle: "npm 包名 package name",
            pluginIdTitle: "插件 id plugin id",
            positionMessage: "这个包的定位是?",
            positionBundle: "插件包",
            positionBundleHint: "随宿主分发,不单独启用",
            positionLibrary: "库包",
            positionLibraryHint: "供其他插件 import,不单独启用",
        },
        capabilities: {
            atomsMessage: "勾选插件能力(全不勾 = 纯工程骨架,空格切换回车确认)",
            toolNameMessage: "工具名 tool name",
            eventsMessage:
                "事件域 Events(域内事件由模板生成;清单外见 {link},68 个事件)",
            eventsLink: "events 矩阵",
            uiMessage:
                "界面位 UI surfaces(Owner 包与槽位由模板处理;清单外槽位见 {link},可自行声明子槽)",
            uiLink: "ui-slots 文档",
            serviceMessage:
                "服务 Service:新建,或扩展常用能力缝 Seam(可多选,清单外见 {link})",
            serviceLink: "capability-seams 全景",
            serviceNew: "新建服务 new service",
            serviceNewHint: "extends Service,其他插件可 inject",
            serviceMore: "其他 others(由用户自行配置)",
            previewTitle: "能力预览",
            pvTool: "工具",
            pvEvents: "事件域",
            pvUi: "UI 界面",
            pvService: "服务",
            pvProtocol: "协议驱动",
            pvUnchecked: "未勾选",
            pvChecked: "已勾选",
            pvUnselected: "(未选)",
            pvNewService: "新建服务",
            pvSkeleton: "(纯工程骨架:不勾任何能力)",
            docsTitle: "官方文档参考:",
            confirmMessage: "确认这份配置?",
            confirmGo: "直接生成",
            confirmGoHint: "按当前勾选继续",
            confirmAdjust: "逐项调整",
            confirmAdjustHint: "回到能力勾选,保留已选值",
        },
        config: {
            message: "配置方式?",
            staticLabel: "静态",
            staticHint: "配置写进 cordis.yml,加载时生效",
            dynamicLabel: "动态",
            dynamicHint:
                "用户可运行时改,实时生效(典型:模型接入类,换 API key 不重启)",
            noneLabel: "无",
            noneHint: "零配置",
            noneDisabledHint:
                "零配置(勾选了设置卡片,需至少静态配置,不可选)",
        },
        summary: {
            title: "问卷汇总",
            dir: "项目目录",
            pkg: "npm 包名",
            pluginId: "插件 id",
            tool: "工具名",
            description: "描述",
            author: "作者",
            position: "包定位",
            atoms: "能力",
            events: "事件域",
            ui: "UI 界面",
            service: "服务",
            config: "配置方式",
            toolNone: "(未勾 Tool)",
            none: "(无)",
            skeleton: "(纯骨架)",
            newService: "新建服务",
            serviceUnselected: "(未选)",
        },
    },
    domain: {
        atoms: {
            tool: { label: "工具", desc: "给模型加可调用工具" },
            events: { label: "事件", desc: "拦截和响应:权限门、审计、事件流" },
            service: { label: "服务", desc: "新建服务,或者扩展常用能力seam" },
            ui: { label: "UI 界面", desc: "往web界面新增面板/卡片 调整视图层" },
            protocol: { label: "协议驱动", desc: "把外部程序/协议桥接进DSH" },
        },
        seams: {
            llm: { label: "模型接入(llm)", desc: "注册 LLM 适配器,接入新的模型/供应商" },
            systemPrompt: {
                label: "提示注入(systemPrompt)",
                desc: "往系统提示注册 section(记忆/知识库)",
            },
            subagents: { label: "子代理(subagents)", desc: "注册新的子代理提供者" },
            web: { label: "网络提供者(web)", desc: "注册搜索/网页抓取提供者" },
            commands: {
                label: "人类命令(commands)",
                desc: "注册人类 slash 命令(/goal、/plan 这类,不走模型)",
            },
            storage: { label: "持久存储(storage)", desc: "提供持久化存储后端" },
        },
        events: {
            tools: { label: "工具执行", desc: "工具执行的拦截、变换与观察:权限门、审计、指标" },
            agent: { label: "agent 生命周期", desc: "agent 循环钩子:会话启动、步前、请求、轮停、错误" },
            session: { label: "会话事件流", desc: "会话创建、销毁与事件订阅" },
            approval: { label: "审批流", desc: "审批请求瀑布:自定义审批 UI、审计记录" },
            fs: { label: "文件观察", desc: "文件系统状态变化(自动格式化/同步类插件)" },
            settings: { label: "设置变更", desc: "用户修改设置时的通知(响应式配置)" },
        },
        ui: {
            "settings-card": {
                label: "设置卡片",
                desc: "在设置页展示/编辑插件配置(动态配置时自动配对)",
            },
            "chat-node": { label: "会话节点", desc: "往对话流插入自定义业务节点渲染" },
            "input-dock": {
                label: "输入区 dock",
                desc: "输入框上方的挂件条(GoalBar 同款位置)",
            },
            sidebar: { label: "侧边栏", desc: "左侧面板区块" },
            "tool-view": {
                label: "工具调用视图",
                desc: "自定义工具调用的展示样式(配合 Tool)",
            },
            "session-header": { label: "会话头", desc: "会话头部动作/角标扩展" },
        },
        scenarios: {
            tool: { label: "工具示例" },
            llm: { label: "LLM 服务示例" },
            ui: { label: "界面示例" },
            events: { label: "事件监听示例" },
            protocol: { label: "HTTP 协议示例" },
        },
    },
    // 生成 README「代码结构」段与聚合文件行内注释(生成物交付语言在生成时刻锁定)
    readme: {
        tool: "src/tool.ts          工具实现(defineTool + schema)",
        events: "src/events.ts        事件域聚合",
        eventsDomains: "src/domains/         各事件域监听(ctx.on)",
        service: "src/service.ts       自有服务(extends Service)",
        seams: "src/seams/index.ts   能力缝聚合",
        seamsImpl: "src/seams/           各能力缝注册实现",
        client:
            "src/client/          浏览器半边(client 聚合入口 + surfaces/ 界面位)",
        protocol: "src/protocol.ts      外部协议桥(webhook → agents)",
        wireDomain: "域",
        wireSeam: "缝",
        wireSurface: "界面位",
        mountService: "ctx.plugin(ExampleService) // 挂载自有服务",
    },
    errors: {
        unknownDep: "未知依赖包,请补版本映射: {pkg}",
        unknownAggregate: "未知的聚合文件契约: {file}",
        templatesRootMissing: "未找到 templates/ 目录(渲染素材缺失)",
        templateMissing: "模板文件缺失: {path}",
        caseMissing: "精选案例不存在:{name}(可用:{cases})",
        patchMissing: "案例 {name} 缺少 cordis.patch.yml,无法生成 dev.patch.yml",
        insertMissing:
            '案例 {name} 的 cordis.patch.yml 缺少 "- insert:" 行,无法生成 dev.patch.yml',
        pkgPosition: "--pkg-position 仅支持:{values}",
        config: "--config 仅支持:{values}",
        configNone:
            "场景 {id} 含 settings-card,--config none 不可用(设置卡片必须有配置可展示)",
    },
} as const;
