# create-dsh-plugin-cli

[![npm version](https://img.shields.io/npm/v/create-dsh-plugin-cli.svg)](https://www.npmjs.com/package/create-dsh-plugin-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/create-dsh-plugin-cli.svg)](https://nodejs.org)

[中文](https://github.com/carbide4826/dsh-plugin-cli/blob/main/README.md) · English

An interactive scaffolding CLI that sets up a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) plugin project skeleton in one shot.

- npm package: `create-dsh-plugin-cli`, bin command: `dshp`
- Dual-track pairing: both the latest and next tracks currently pair dsh `0.2.1-rc.2`; choose via `--target`, default latest
  - Note: the official npm latest and next tags are both `0.2.1-rc.2`, and our latest track has caught up; track names are stable containers and never change with the version
- Node requirement: `^22.19.0 || >=24.0.0`

> Development and verification are based on the web host (`dsh web`); other host profiles are unverified — please open an [issue](https://github.com/carbide4826/dsh-plugin-cli/issues) if you hit problems.

## Quick start

```sh
npm create dsh-plugin-cli          # zero-install, enters the interactive questionnaire
# or
npx create-dsh-plugin-cli
```

## Installing the `dshp` command

`dshp` is this package's bin command (npm creates the link automatically from the `bin` field); three ways to get it:

```sh
npm i -g create-dsh-plugin-cli     # global install: use the dshp command directly (assumed below)
npx create-dsh-plugin-cli ...      # run once without installing (= npm create dsh-plugin-cli -- ...)
npm i create-dsh-plugin-cli        # in-project install: invoke via npx dshp / pnpm dshp
```

## Commands

```sh
dshp --help              # main command overview
dshp create --help       # full options plus the preset / curated-case list
dshp list                # what you can pick: presets / cases / atoms / event domains / surfaces / seams / both tracks' version pairing
dshp list --json         # the same, machine-readable (consumed directly by agents / MCP)
dshp spec                # what one interview has to ask (the question, whether it can be skipped, the options)
dshp spec --json         # the same, machine-readable (consumed directly by agents / MCP)
dshp mcp                 # run the MCP server over stdio, handing generation to models
```

`dshp list` is the **authoritative live catalog**: which atoms exist, which host package and
slot key a surface lands on, which atoms a surface requires, which dsh version a track pins —
run it and you have them.

Options supported by `dshp create` are listed under [Overridable parameters](#overridable-parameters) below.

## Usage

### Interactive

```sh
dshp create my-plugin              # interactive questionnaire → plugin skeleton
```

Interactive snapshot

```text
┌  dshp · DSH plugin scaffolder
│
◆  Project directory
│  my-plugin
│
◇  One-line description (optional, press Enter to skip)
│
◇  Author (optional, press Enter to skip)
│
◆  npm package name
│  my-plugin
│
◆  plugin id
│  my-plugin
│
◆  Which dsh host generation to pair with?
│  ● latest · dsh 0.2.1-rc.2
│  ○ next · dsh 0.2.1-rc.2
│
◆  Where do you want to start?
│
├─ ● Curated case ────────────┐
│                             ▼
│                     ◆ Pick a curated case
│                     │ ● quick-tool      ── query tool + result card
│                     │ ○ model-gateway   ── bring-your-own model gateway + dynamic settings
│                     │ ○ session-bot     ── auto-respond in sessions
│                     │ ○ webhook-bridge  ── bridge external events
│                     │ ○ notebook        ── per-user notes
│                     │
│                     └─ Copied N files → ./my-plugin
│
└─ ○ Atom combination ────────┐
                              ▼
                      ◆ What is this package positioned as?
                      │ ● bundle   ── plugin bundle shipped with the host
                      │ ○ library  ── standalone published library
                      │
                      ◆ Select plugin capabilities (Space toggles, Enter confirms)
                      │ ◻ tool      ── add callable tools for the model
                      │ ◻ events    ── intercept and respond: gates, audit, event streams
                      │ ◻ service   ── create a service, or extend common capability seams
                      │ ◻ ui        ── add panels/cards to the web UI
                      │ ◻ protocol  ── bridge external programs/protocols into DSH
                      │
                      ◆ Configuration mode?
                      │ ● none
                      │ ○ static
                      │ ○ dynamic
                      │
                      └─ Generated N files → ./my-plugin
```

The CLI language follows `--lang` (zh | en) or auto-detects from the `LANG` environment variable; generated projects deliver a single-language README following the language at generation time.

### Non-interactive

Curated case (`-s`, copies a real project directory as-is):

```sh
dshp create my-notes --template notebook -s --description <text> --author <name>
```

Atom combination (assembled from picked capabilities):

```sh
dshp create my-llm --template llm --pkg-position library --author <name> --description <text>
```

Pair with the next-track host (`--target next`; the project pins dsh 0.2.1-rc.2 — the latest track and interactive mode work the same way):

```sh
dshp create my-gw --template model-gateway -s --target next
```

#### Overridable parameters

| Flag                        | Values                        | Default when omitted          |
| --------------------------- | ----------------------------- | ----------------------------- |
| `--pkg-name <name>`         | npm package name              | derived from dir name (`-s`: follows plugin id) |
| `--plugin-id <id>`          | plugin id                     | derived from dir name         |
| `--tool-name <name>`        | tool name                     | preset (`example_tool`)       |
| `--description <text>`      | text                          | preset copy                   |
| `--author <name>`           | text                          | empty                         |
| `--pkg-position <position>` | `bundle` / `library`          | `bundle`                      |
| `--config <mode>`           | `none` / `static` / `dynamic` | preset (ui preset uses `static`) |
| `--target <track>`          | `latest` / `next`             | `latest` (pairing track: dsh version and dependency pairing pin per track) |
| `--dry-run`                 | boolean                       | off (prints the file list that would be generated, writes nothing) |

> Curated cases do not take `--tool-name` / `--pkg-position` / `--config` (the structure is locked by the case).

#### Free combination (non-interactive)

Passing any capability flag takes this path — the questionnaire is skipped:

```sh
dshp create my-orders --atoms tool,ui --ui-surfaces settings-card --config dynamic \
  --tool-name query_orders --target next
```

| Flag                       | Values                                                            |
| -------------------------- | ----------------------------------------------------------------- |
| `--atoms <list>`           | `tool` / `events` / `service` / `ui` / `protocol` (comma-separated) |
| `--event-domains <list>`   | `tools` / `agent` / `session` / `approval` / `fs` / `settings`    |
| `--ui-surfaces <list>`     | `settings-card` / `chat-node` / `input-dock` / `sidebar` / `tool-view` / `session-header` |
| `--service-seams <list>`   | `llm` / `systemPrompt` / `subagents` / `web` / `commands` / `storage` |
| `--new-service`            | boolean (create a new own service; pairs with `--atoms service`)   |

Hard constraints are validated by the CLI and reported with **stable error codes** (the text
follows the language, the code does not): unknown id (`ATOM_UNKNOWN` /
`EVENT_DOMAIN_UNKNOWN` / `UI_SURFACE_UNKNOWN` / `SEAM_UNKNOWN`), a surface missing its
required atom (`SURFACE_REQUIRES_ATOM`, e.g. `tool-view` without `tool`), and
`settings-card` with `config=none` (`CONFIG_NONE_REQUIRES_SETTINGS_CARD`).

## After generation

```sh
cd my-plugin
pnpm install                                # ① install deps
pnpm add -D @deepseek-ai/dsh@0.2.1-rc.2    # ② install the dsh host
pnpm build                                  # ③ build
pnpm dsh web --patch ./dev.patch.yml        # ④ launch the dsh host (direct source load)
```

The build-script approval list ships pre-written in the generated project's `pnpm-workspace.yaml`
(`allowBuilds`), on the same split as the official dsh: `true` for the packages whose scripts
must run, `false` for the no-op ones — nothing to approve by hand. If pnpm reports
`ERR_PNPM_IGNORED_BUILDS`, a newly added dependency ships a build script: add the entry pnpm prints.

Generated project layout (grows and shrinks with the picked capabilities):

```text
my-plugin/                  ← project dir = the directory name you entered
├─ package.json             name = your npm package name; description/author live here too
├─ src/index.ts             plugin entry (export const name = your plugin id; inject/apply)
├─ src/tool.ts              tool implementation (when tool is picked)
├─ src/domains/             per-domain event listeners (when events is picked)
├─ src/client/surfaces/     UI cards (when ui is picked; debugging requires the build + plugin add track)
├─ cordis.patch.yml         distribution config layer (id = plugin id; effective after plugin add)
├─ dev.patch.yml            local debug overlay (--patch direct load; not committed)
└─ README.md                full in-project instructions (dsh install / script approval / debugging)
```

> dsh is [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — a local runtime for models, tools and sessions; the homepage links docs and source.
>
> Host CLI flags confusing? `docs/dsh-command-builder.html` is a visual assembler: open it in a browser, click flags on and off, copy the assembled command.

## One interview, everything asked

`dshp spec` prints what a generation has to ask the user: each step's question, whether it can be
skipped, what the fallback is, and where the options come from. The table is for **agents** — a
model walks it step by step instead of dumping the CLI's parameter table on the user.

```sh
dshp spec                 # human-readable: the interview checklist
dshp spec --json          # machine-readable: steps + questions + skip semantics + options
dshp spec --mode free     # only the steps of the custom-combination route
```

On the MCP side this is the `dshp_spec` tool: pass the spec collected so far, get back which
steps are still missing, whether it is ready to build, and — once ready — the compiled
parameters. The usual loop:

```
empty spec → dshp_spec (get the first question) → ask the user → merge into the spec
           → dshp_spec (what is still missing) → … → ready=true → dshp_create_plugin
```

## Agent skill

This package ships an agent skill (`skills/dshp/`) that teaches an agent how to scaffold a dsh plugin project with dshp, and records the pitfalls that are expensive to rediscover (approve-builds, the cordis double instance, typecheck going green on missing types, UI surfaces only rendering after `build` + `plugin add`).

The skill's body is written in **English** — it is written for models, and English costs fewer tokens and models understand it better. The frontmatter's trigger words cover both languages, so a question in either one still matches. What to ask isn't hard-coded in the skill: it's taken live from `dshp spec --json`, and the snapshot inside the skill is only a fallback for when the CLI is unavailable.

The skill ships with the npm package. Unpack it into your agent's skill directory (the directory name differs per agent; common ones are `~/.claude/skills/` or `~/.minimax/skills/`):

```sh
npm pack create-dsh-plugin-cli          # fetch the package
tar -xzf create-dsh-plugin-cli-*.tgz package/skills/dshp
cp -r package/skills/dshp ~/.minimax/skills/dshp
```

The skill bundles a driver script — the scriptable entry for free atom combinations. It produces a **pure generator artifact** (no hand-editing), plus a post-generation self-check and a JSON summary:

```sh
node skills/dshp/scripts/drive-questionnaire.mjs --dir my-orders --target next \
  --atoms tool,ui --surfaces settings-card --tool-name query_orders
```

## MCP server

This package ships an MCP server (`dshp mcp`, stdio transport) that hands generation to models directly.

```sh
dshp mcp --lang zh     # run the MCP server (--lang pins the language of generated projects; default: auto-detected)
```

Host configuration example:

```json
{
  "mcpServers": {
    "dshp": {
      "command": "npx",
      "args": ["-y", "create-dsh-plugin-cli", "mcp", "--lang", "zh"]
    }
  }
}
```

Four tools:

| tool | what it does |
| --- | --- |
| `dshp_list_scenarios` | what you can pick: presets / curated cases / atoms / event domains / UI surfaces / seams (with host package, slot key and required atoms) |
| `dshp_spec` | interview checklist and gap check: what each step asks, whether it can be skipped, which steps are still missing, whether it is ready to build |
| `dshp_doctor` | diagnoses this machine: node version, pnpm, the dsh CLI, both tracks' material and generation-pipeline self-checks, whether the current directory is writable |
| `dshp_create_plugin` | generates a plugin project (preset / curated case / free combination) |

Two rules:

- **Legal values are derived from the source**: the tool input schema is generated from the domain manifests (atom / event domain / surface / seam / preset / case ids are all enums), so a model sees the legal values in the schema itself and never retries with a stale id.
- **Writing to disk needs explicit confirmation**: `dshp_create_plugin` only computes a plan by default (`dryRun` defaults to true) and returns the file list that would be produced; call it again with the same arguments and an explicit `dryRun: false` to write.

Every failure carries a stable error code (such as `SURFACE_REQUIRES_ATOM` / `DIR_EXISTS` / `CASE_NOT_FOUND`) rather than a localized sentence.

> Hosts that spawn a subprocess usually inherit only a few environment variables (`HOME` / `PATH` / `SHELL` / `TERM` / `USER`) — **`LANG` is not among them**, so the MCP side cannot detect the system locale. In a Chinese environment, start the server with `--lang zh`, or pass `lang: "zh"` when calling `dshp_create_plugin`.

## Version notes

**Tracks and pairing** (chosen at generation time via `--target`, default latest; the official npm latest and next tags are both `0.2.1-rc.2`, and both of our tracks pair that version):

| Track | dsh host | Key pairing (cordis / schemastery) |
| --- | --- | --- |
| `latest` | `0.2.1-rc.2` | `~4.0.5` / `~3.18.5` |
| `next` | `0.2.1-rc.2` | `~4.0.5` / `~3.18.5` |

Dependencies pair exactly with the host version; mismatched mixes can spawn a second instance in the install tree, breaking declaration merging and failing typecheck.

**The host's plugin version gate**: when installing or loading a plugin, dsh validates every `@deepseek-ai/dsh` and `@deepseek-ai/dsh-*` entry in the plugin's `peerDependencies` (other dependencies are not checked); an unsatisfied range is **rejected at install time** with an "incompatible" message. So a product only installs on a host matching its peer: with both tracks on the same version today the products are interchangeable, and once promotion pulls them apart, an older-track product no longer installs on a newer host and vice versa — keep the product track aligned with the host version. To force a cross-version install anyway, use the official exemption command (the rejection message prints the full command):

```sh
dsh plugin --profile web allow-version <plugin>@<version> --dsh-version <host version> --accept-risk
```

> The exemption only records that you accept the risk; cross-track products are not guaranteed to work.

**Plugin display info**: the host's plugin manager renders the name / description / icon from the plugin package's `locale/<lang>.json` (`meta.title` / `meta.description`, picked by the host UI locale with English fallback) and the `icon` field in `package.json`; this template ships them by default — edit `locale/zh.json` to change the copy.

## Changelog

Full release notes for every version live in [CHANGELOG.en.md](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.en.md) (Chinese: [CHANGELOG.md](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.md)).

## Roadmap

- `--template` custom sources: local path / git URL / npm package

Shipped: bilingual UI and per-language READMEs (`--lang zh|en`), dual-track templates (choose
via `--target`), continuous tracking of the dsh version line, and the agent skill plus MCP server.

## License

[MIT](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
