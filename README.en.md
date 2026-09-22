# create-dsh-plugin-cli

[![npm version](https://img.shields.io/npm/v/create-dsh-plugin-cli.svg)](https://www.npmjs.com/package/create-dsh-plugin-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/create-dsh-plugin-cli.svg)](https://nodejs.org)

[中文](https://github.com/carbide4826/dsh-plugin-cli/blob/main/README.md) · English

An interactive scaffolding CLI that sets up a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) plugin project skeleton in one shot.

- npm package: `create-dsh-plugin-cli`, bin command: `dshp`
- Tracks dsh version: `0.1.5-rc.2`; will follow dsh version bumps
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

`dshp` currently has a single subcommand `create` (interactive questionnaire, or non-interactive `--template`):

```sh
dshp --help              # main command overview
dshp create --help       # full options plus the preset / curated-case list
```

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

> Curated cases do not take `--tool-name` / `--pkg-position` / `--config` (the structure is locked by the case).

## After generation

```sh
cd my-plugin
pnpm install --ignore-workspace   # ① install deps (a parent pnpm-workspace.yaml hijacks the install without this)
pnpm approve-builds               # ② supply-chain protection blocks build scripts: approve node-pty / koffi / @deepseek-ai/dsh-subprocess-local (@google/genai / protobufjs are no-ops); re-run install once after approving
pnpm add -D @deepseek-ai/dsh@0.1.5-rc.2   # ③ install the dsh host (bare latest is a stale placeholder; approve-builds again after)
pnpm build                        # ④ build
pnpm dsh web --patch ./dev.patch.yml      # ⑤ launch the dsh host (direct source load for debugging)
```

Generated project layout (grows and shrinks with picked capabilities; where each questionnaire answer lands is annotated):

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

## Roadmap

- Keep tracking dsh version bumps
- `--template` custom sources: local path / git URL / npm package
- ✅ Localization — delivered in 0.1.1: bilingual UI via `--lang zh|en`, per-language README in generated projects
- Agent tool recognition and invocation, planned as a skill or MCP form

## License

[MIT](https://github.com/carbide4826/dsh-plugin-cli/blob/main/LICENSE)
