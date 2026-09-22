// 英文字典(结构在类型层锁定为与 zh 一致,漏 key 编译不过)
import type { Dict } from "./index";

export const en = {
    common: {
        cancelled: "Cancelled",
    },
    cli: {
        intro: "dshp · DSH plugin scaffolder",
        introCase: "dshp · curated case: {name}",
        introPreset: "dshp · preset quick-start: {id} ({label})",
        warnOverride:
            "override flags (--pkg-name/--config etc.) only apply with --template; ignored this run",
        warnCaseInapplicable:
            "curated cases are copied as-is; these override flags do not apply and were ignored: {flags}",
        warnToolNameIgnored:
            "--tool-name is set, but the preset has no tool atom; the value will not appear in the output",
        errScenarioNeedsTemplate:
            "--scenario (-s) must be combined with --template <case-id> (see dshp create --help)",
        errCaseNotFound:
            'case "{name}" not found. Available cases: {cases} (see dshp create --help)',
        errUnknownScenario:
            'unknown preset "{name}". Available presets: {ids} (see dshp create --help)',
        errCheckFailed: "option validation failed",
        startMessage: "Where do you want to start?",
        startCase: "Curated case",
        startCaseHint: "Copy a complete, ready-to-run project",
        startAtoms: "Atom combination",
        startAtomsHint: "Pick capabilities and assemble a minimal skeleton",
        caseSelect: "Pick a curated case",
        cancelledNoFiles: "Cancelled. No files were generated.",
        dirExists: "Directory already exists: {dir} (choose another name, or remove it and retry)",
        copied: "Copied {n} files → {dir} (identity rewritten to {name})",
        generated: "Generated {n} files → {dir}",
        fileList: "Files",
        confirmGenerate: "Generate the project with these answers?",
        caseHints: {
            "quick-tool": "query tool + result card",
            "model-gateway": "bring-your-own model gateway + dynamic settings",
            "session-bot": "auto-respond in sessions",
            "webhook-bridge": "bridge external events",
            notebook: "per-user notes",
        },
        helpBody: `Scenario quick-start (--template has two sources, switch with -s):

1) Preset combination (default):
   dshp create <name> --template <preset>
   dshp create --template <preset>

   Presets:
     tool       Tool example (tool atom, toolName=example_tool)
     llm        LLM service example (service + llm seam)
     ui         UI example (settings-card, static config)
     events     Event listener example (session domain)
     protocol   HTTP protocol example (protocol atom)

2) Curated cases (-s):
   dshp create <name> --template <case> -s

   Cases:
     quick-tool      Custom query tool + result card (tool + tool-view)
     model-gateway   Bring your own model gateway (llm seam + dynamic settings card)
     session-bot     Auto-respond in sessions (events + llm seam)
     webhook-bridge  Bridge external events into sessions (protocol + events)
     notebook        Per-user notes (storage seam + tool)

Overridable fields:
  --pkg-name <name>          npm package name
  --plugin-id <id>           plugin id
  --tool-name <name>         tool name (tool scenario)
  --description <text>       description
  --author <name>            author
  --pkg-position <position>  bundle | library
  --config <mode>            none | static | dynamic

Language:
  --lang <lang>              zh | en (default: auto-detect from LANG)`,
    },
    prompts: {
        basic: {
            dirTitle: "Project directory",
            cwdValid: "Using the current directory; plugin id defaults to the folder name {name}",
            cwdInvalid:
                "Folder name {name} has no usable ASCII characters; please fill in the plugin id yourself",
            description: "One-line description (optional, press Enter to skip)",
            author: "Author (optional, press Enter to skip)",
            pkgTitle: "npm package name",
            pluginIdTitle: "plugin id",
            positionMessage: "What is this package positioned as?",
            positionBundle: "Plugin bundle",
            positionBundleHint: "shipped with the host, never started on its own",
            positionLibrary: "Library",
            positionLibraryHint: "imported by other plugins, never started on its own",
        },
        capabilities: {
            atomsMessage:
                "Select plugin capabilities (none = bare skeleton; Space toggles, Enter confirms)",
            toolNameMessage: "Tool name",
            eventsMessage:
                "Event domains (domain events come from templates; for the full list see {link}, 68 events)",
            eventsLink: "events matrix",
            uiMessage:
                "UI surfaces (owner packages and slots are handled by templates; for slots beyond this list see {link}, custom sub-slots allowed)",
            uiLink: "ui-slots docs",
            serviceMessage:
                "Service: create a new one, or extend a common capability seam (multi-select; full list see {link})",
            serviceLink: "capability-seams overview",
            serviceNew: "New service",
            serviceNewHint: "extends Service; other plugins can inject it",
            serviceMore: "Others (configure yourself)",
            previewTitle: "Capability preview",
            pvTool: "Tool",
            pvEvents: "Event domains",
            pvUi: "UI surfaces",
            pvService: "Service",
            pvProtocol: "Protocol",
            pvUnchecked: "unchecked",
            pvChecked: "checked",
            pvUnselected: "(none)",
            pvNewService: "new service",
            pvSkeleton: "(bare skeleton: no capabilities selected)",
            docsTitle: "Official docs:",
            confirmMessage: "Keep this configuration?",
            confirmGo: "Generate now",
            confirmGoHint: "continue with current picks",
            confirmAdjust: "Adjust",
            confirmAdjustHint: "back to the checklist, previous picks kept",
        },
        config: {
            message: "Configuration mode?",
            staticLabel: "Static",
            staticHint: "written into cordis.yml, applied at load time",
            dynamicLabel: "Dynamic",
            dynamicHint:
                "editable at runtime with instant effect (typical: model access, swap API key without restart)",
            noneLabel: "None",
            noneHint: "zero config",
            noneDisabledHint:
                "zero config (a settings card requires at least static config; unavailable)",
        },
        summary: {
            title: "Questionnaire summary",
            dir: "Directory",
            pkg: "npm name",
            pluginId: "Plugin id",
            tool: "Tool name",
            description: "Description",
            author: "Author",
            position: "Position",
            atoms: "Capabilities",
            events: "Event domains",
            ui: "UI surfaces",
            service: "Service",
            config: "Config mode",
            toolNone: "(no tool)",
            none: "(none)",
            skeleton: "(bare skeleton)",
            newService: "new service",
            serviceUnselected: "(none)",
        },
    },
    domain: {
        atoms: {
            tool: { label: "Tool", desc: "Add callable tools for the model" },
            events: { label: "Events", desc: "Intercept and respond: permission gates, audit, event streams" },
            service: { label: "Service", desc: "Create a service, or extend common capability seams" },
            ui: { label: "UI", desc: "Add panels/cards to the web UI, adjust the view layer" },
            protocol: { label: "Protocol", desc: "Bridge external programs/protocols into DSH" },
        },
        seams: {
            llm: { label: "Model access (llm)", desc: "Register LLM adapters for new models/providers" },
            systemPrompt: {
                label: "Prompt injection (systemPrompt)",
                desc: "Register sections into the system prompt (memory/knowledge base)",
            },
            subagents: { label: "Subagents", desc: "Register new subagent providers" },
            web: { label: "Web providers", desc: "Register search / web-fetch providers" },
            commands: {
                label: "Human commands",
                desc: "Register human slash commands (/goal, /plan; no model involved)",
            },
            storage: { label: "Persistent storage", desc: "Provide persistent storage backends" },
        },
        events: {
            tools: { label: "Tool execution", desc: "Intercept, transform and observe tool execution: gates, audit, metrics" },
            agent: { label: "Agent lifecycle", desc: "Agent loop hooks: session start, pre-step, request, turn stop, errors" },
            session: { label: "Session events", desc: "Session creation, disposal and event subscription" },
            approval: { label: "Approval flow", desc: "Approval request waterfall: custom approval UI, audit trail" },
            fs: { label: "File watching", desc: "File system changes (auto-format / sync style plugins)" },
            settings: { label: "Settings changes", desc: "Notify when the user changes settings (reactive config)" },
        },
        ui: {
            "settings-card": {
                label: "Settings card",
                desc: "Show/edit plugin config on the settings page (auto-paired with dynamic config)",
            },
            "chat-node": { label: "Chat node", desc: "Render custom business nodes in the conversation flow" },
            "input-dock": {
                label: "Input dock",
                desc: "Widget strip above the input box (same slot as GoalBar)",
            },
            sidebar: { label: "Sidebar", desc: "Left panel section" },
            "tool-view": {
                label: "Tool view",
                desc: "Custom rendering for tool calls (pairs with Tool)",
            },
            "session-header": { label: "Session header", desc: "Session header actions / badges" },
        },
        scenarios: {
            tool: { label: "Tool example" },
            llm: { label: "LLM service example" },
            ui: { label: "UI example" },
            events: { label: "Event listener example" },
            protocol: { label: "HTTP protocol example" },
        },
    },
    // Generated README structure section and inline comments (deliverable language is locked at generation time)
    readme: {
        tool: "src/tool.ts          tool implementation (defineTool + schema)",
        events: "src/events.ts        event-domain aggregate",
        eventsDomains: "src/domains/         per-domain listeners (ctx.on)",
        service: "src/service.ts       own service (extends Service)",
        seams: "src/seams/index.ts   capability-seam aggregate",
        seamsImpl: "src/seams/           per-seam registration",
        client:
            "src/client/          browser half (client aggregate entry + surfaces/)",
        protocol: "src/protocol.ts      external protocol bridge (webhook → agents)",
        wireDomain: "domain",
        wireSeam: "seam",
        wireSurface: "surface",
        mountService: "ctx.plugin(ExampleService) // mount own service",
    },
    errors: {
        unknownDep: "unknown dependency, please add a version mapping: {pkg}",
        unknownAggregate: "unknown aggregate file contract: {file}",
        templatesRootMissing: "templates/ directory not found (render assets missing)",
        templateMissing: "template file missing: {path}",
        caseMissing: "curated case not found: {name} (available: {cases})",
        patchMissing: "case {name} lacks cordis.patch.yml; cannot generate dev.patch.yml",
        insertMissing:
            'cordis.patch.yml of case {name} lacks a "- insert:" line; cannot generate dev.patch.yml',
        pkgPosition: "--pkg-position only supports: {values}",
        config: "--config only supports: {values}",
        configNone:
            "preset {id} includes settings-card; --config none is unavailable (a settings card must have config to show)",
    },
} as const satisfies Dict;
