# CLI surface and generated project structure

> This file is a **snapshot**, used as a fallback only when the dshp CLI is unavailable — the
> catalog changes as the version moves. With the CLI at hand, take the live values from
> `dshp list --json` / `dshp spec --json` (see "Live discovery" at the end).
> Hand-writing parameters from this snapshot without the CLI produces a plugin that *looks*
> right without *being* right — in that case tell the user they need a dshp CLI with the
> `spec` subcommand, and let them decide whether to install it.
>
> Companions: the interview flow and how to ask each step are in
> [interview.md](interview.md); complete transcripts you can copy (need → Q&A → spec →
> compiled command) are in [examples.md](examples.md).

## Subcommands and options

| Subcommand | What it does |
| --- | --- |
| `create [name]` | Generate a plugin project (preset / curated case / free combination / interactive questionnaire) |
| `list [--json]` | Everything you can pick; `--json` is machine-readable |
| `spec [--json] [--mode <m>]` | What one interview has to ask (how to ask / skippable / options); `--json` is machine-readable |
| `mcp [--lang <lang>]` | Start the MCP server (stdio), handing generation to models |

The positional `[name]` of `create` is the project directory name (default: the preset's
default name, or `my-plugin` for the interactive path). An existing target directory → exit
code 1.

`create` options:

| Option | Values | Notes |
| --- | --- | --- |
| `--template <source>` | preset id or curated case id | Non-interactive entry; when given, the preset/case path runs and the questionnaire is skipped |
| `-s, --scenario` | boolean | The template comes from the curated case library (whole directory copied) rather than the preset pipeline; requires `--template` |
| `--target <track>` | `latest` \| `next` | Which generation of the dsh host to pair with; default `latest` |
| `--pkg-name <name>` | string | Override the npm package name (default = the plugin id) |
| `--plugin-id <id>` | string | Override the plugin id (default = the directory name) |
| `--tool-name <name>` | string | Override the tool name (meaningful for the tool preset) |
| `--description <text>` | string | Override the description (replaces the curated case's default description) |
| `--author <name>` | string | Override the author |
| `--pkg-position <position>` | `bundle` \| `library` | Package position; `library` produces no `cordis.patch.yml` |
| `--config <mode>` | `none` \| `static` \| `dynamic` | Config mode; `none` conflicts with settings-card |
| `--atoms <list>` | comma-separated | Atoms of the free combination (non-interactive); giving any capability flag takes the free-combination path |
| `--event-domains <list>` | comma-separated | Event domains of the free combination |
| `--ui-surfaces <list>` | comma-separated | UI surfaces of the free combination |
| `--service-seams <list>` | comma-separated | Capability seams of the free combination |
| `--new-service` | boolean | Create a new own service (pairs with `--atoms service`) |
| `--dry-run` | boolean | Print the list of files that would be generated, without writing |
| `--lang <lang>` | `zh` \| `en` | Program-level option, defaults to probing `LANG` / `DSHP_LANG` |

`--lang` is program-level: the help text renders through it too. Non-interactive calls should
pass it explicitly, so the generated project's language matches what was intended.

## Presets (the capability set is locked)

| id | Locked capabilities | Default directory |
| --- | --- | --- |
| `tool` | tool atom, toolName=`example_tool` | my-tool |
| `llm` | service atom + new service + llm seam | my-llm |
| `ui` | ui atom + settings-card surface + static config | my-ui |
| `events` | events atom + session domain | my-events |
| `protocol` | protocol atom | my-protocol |

Presets accept `--pkg-name` / `--plugin-id` / `--tool-name` / `--description` / `--author` /
`--pkg-position` / `--config` overrides. `--tool-name` on a preset without the tool atom is
ignored (with a warning).

## Curated cases (whole directory copied, `-s`)

A curated case id **must** come with `-s`; without it the id is looked up among the presets
and "unknown preset" is reported when it isn't there. Conversely, `-s` on its own (without
`--template`) errors out.

| id | Shape |
| --- | --- |
| `quick-tool` | A custom query tool plus a result card (tool + tool-view) |
| `model-gateway` | Bring your own model service (llm seam + a dynamic settings card) |
| `session-bot` | Auto-respond in sessions (events + llm seam) |
| `webhook-bridge` | Bridge external events into the session (protocol + events) |
| `notebook` | Per-user data storage (storage seam + tool) |

On the curated-case path `--tool-name` / `--pkg-position` / `--config` don't apply (the
structure is locked by the case) — passing them warns; the identity and metadata options
(`--plugin-id` / `--pkg-name` / `--description` / `--author`) still take effect.

While copying, every occurrence of the case id is replaced with the plugin id **on word
boundaries** (covering `export const name`, the id in `cordis.patch.yml`, the client id in
`tsdown.config.ts`, and the README prose). The package name is not part of the replacement —
it is written structurally into `package.json`.

## Free combination (the non-interactive entry)

Giving any capability flag (`--atoms` / `--event-domains` / `--ui-surfaces` /
`--service-seams` / `--new-service`) takes this path and **skips the questionnaire**:

```sh
dshp create my-orders --atoms tool,ui --ui-surfaces settings-card \
  --config dynamic --tool-name query_orders --target next
```

The hard constraints are validated by the CLI; a violation exits with code 1 and a stable
error code (the message follows the language, the code doesn't):

| Error code | Trigger |
| --- | --- |
| `ATOM_UNKNOWN` / `EVENT_DOMAIN_UNKNOWN` / `UI_SURFACE_UNKNOWN` / `SEAM_UNKNOWN` | The id isn't in the catalog |
| `SURFACE_REQUIRES_ATOM` | A surface's required atom wasn't picked (every surface needs `ui`; `tool-view` also needs `tool`) |
| `CONFIG_NONE_REQUIRES_SETTINGS_CARD` | `settings-card` with `config=none` |
| `CONFIG_INVALID` / `PKG_POSITION_INVALID` | Illegal value |
| `DIR_EXISTS` | The target directory already exists |

`--dry-run` prints the file list without writing anything (the "look before you write" entry;
the MCP path's "explicit confirmation before writing" rides on the same layer).

## The selectable catalog (free combination)

Atoms: `tool` / `events` / `service` / `ui` / `protocol`

Event domains: `tools` / `agent` / `session` / `approval` / `fs` / `settings`

UI surfaces: `settings-card` / `chat-node` / `input-dock` / `sidebar` / `tool-view` /
`session-header`

Capability seams: `llm` / `systemPrompt` / `subagents` / `web` / `commands` / `storage`

The hard dependency from a surface to its atoms (a missing atom produces a dumb interface
that silently never renders):

| Surface | Atoms that must be picked alongside |
| --- | --- |
| All six | `ui` (the surface implementation files and the client aggregation entry are produced by the ui atom; without it the surface selection is silently dropped) |
| `tool-view` | additionally `tool` (it renders a tool call) |

Surface → host package → slot key (slot keys change with the host version; the package ships
the current value):

| Surface | Host package | Slot key |
| --- | --- | --- |
| `settings-card` | `@deepseek-ai/dsh-client-ui-settings-plugins` | `settings.plugins.tab` |
| `chat-node` | `@deepseek-ai/dsh-client-ui-chat` | `conversation.chat.node` |
| `input-dock` | `@deepseek-ai/dsh-client-ui-conversation` | `conversation.input.dock` / `conversation.composer.bar` |
| `sidebar` | `@deepseek-ai/dsh-client-ui-sidebar` | `sidebar.panellist` |
| `tool-view` | `@deepseek-ai/dsh-client-ui-tool` | `tool.call.toolview` |
| `session-header` | `@deepseek-ai/dsh-client-ui-conversation` | `conversation.session.header` |

Also: `settings-card` must have a configuration (it cannot be `config: none`), and the
`@deepseek-ai/schemastery` dependency only comes in when `config` is not `none`.

## MCP server (`dshp mcp`)

When the host can mount MCP, using the tools is more robust than letting the agent assemble
CLI commands (legal ids are enforced by the schema).

```sh
dshp mcp --lang zh     # stdio protocol; stdout is the JSON-RPC channel, write nothing else there
```

Host configuration:

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

| tool | What it does |
| --- | --- |
| `dshp_list_scenarios` | Everything you can pick (`scope`: all / presets / cases / capabilities; `target` narrows by track) |
| `dshp_spec` | Interview checklist + gap check (what to ask / skippable / which steps are missing / whether it's ready) |
| `dshp_doctor` | Diagnose this machine: node version, pnpm, the dsh CLI, both tracks' materials and generation-pipeline self-checks, directory writability |
| `dshp_create_plugin` | Generate (`mode`: preset / case / free) |

Key points:

- **Legal values live in the schema**: atoms / event domains / UI surfaces / capability seams /
  preset and curated case ids are all enums, so the model gets the current values and never
  retries with a stale id.
- **`dshp_spec` is the flow source for the interview**: the input is "the spec collected so
  far", the output is "which steps are still missing, whether it's ready to go", plus the
  compiled CLI and create parameters once it is. The correct usage: call it once with an empty
  spec to get the first question → merge each answered step into the spec and call again →
  generate only once `ready` is true. See references/interview.md.
- **Writing to disk needs explicit confirmation**: `dshp_create_plugin` only computes a plan by
  default (`dryRun` defaults to true) and returns the files that would be produced; call it
  again with the same arguments and an explicit `dryRun: false` to write.
- **Language**: hosts that spawn a subprocess usually don't inherit `LANG`, so the environment
  probe can't see the user's language — start the service with `--lang zh` in a Chinese
  environment, or pass `lang: "zh"` when calling.
- Failures carry stable error codes (`SURFACE_REQUIRES_ATOM` / `DIR_EXISTS` /
  `CASE_NOT_FOUND` …), the same codes as the CLI; the artifacts are byte-identical to the
  CLI's.

## Generated project structure

```
<dir>/
  package.json        # three dependency buckets / exports / files allowlist / dsh keys / icon
  cordis.patch.yml    # bundle position only (not produced for library)
  dev.patch.yml       # generated artifact: absolute path on this machine, gitignored
  tsconfig.json  tsdown.config.ts  pnpm-workspace.yaml  .gitignore
  README.md           # delivered in one language (the material is picked by --lang)
  icon.svg            # icon for the plugin listing page
  locale/zh.json  locale/en.json   # meta name / description (read by the host's detail page)
  src/index.ts        # entry: name / inject / apply
  src/tool.ts  src/events.ts  src/seams/index.ts  src/client/index.ts ...
```

The generated project ships its own `pnpm-workspace.yaml` (the workspace boundary) so an
ancestor workspace can't hijack it and prevent `node_modules` from being created — which is
why you must **not** add `--ignore-workspace`.

The key `exports` entries in `package.json`: `"."` → `./dist/index.js`; a bundle position adds
`"./package.json"`, `"./locale/*.json"` and `"./cordis.patch.yml"`; a UI project adds
`"./client"`. The `files` allowlist must list `dist` explicitly (along with `icon.svg` /
`locale` / `cordis.patch.yml`) — otherwise npm falls back to `.gitignore` as a denylist and
the artifact loses files.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success; or the user aborted the interactive flow |
| 1 | Failure: directory exists, unknown preset/case/track, illegal `--lang` / `--config` / `--pkg-position`, a guardrail tripped |

## Live discovery (takes precedence over this snapshot)

⚠️ These commands need a dshp CLI **with the `spec` / `list` subcommands** (npm package
`create-dsh-plugin-cli`). Without it this file is only a fallback — **don't hand-write
parameters from it**.

**`dshp list` is the authoritative live catalog** — presets / curated cases / atoms / event
domains / UI surfaces / capability seams / both tracks' version pairing, all in one go:

```sh
dshp list            # human-readable
dshp list --json     # machine-readable (consumed directly by agents / MCP)
```

The installed package's materials directory is the authoritative catalog:

```sh
# the curated case list (one per track)
ls node_modules/create-dsh-plugin-cli/templates/latest/scenarios
ls node_modules/create-dsh-plugin-cli/templates/next/scenarios

# presets / curated cases and every flag
npx create-dsh-plugin-cli create --help
```

Version pairing (the dsh version each track pins) is read from the **generated project**,
never guessed:

```sh
# the pinned @deepseek-ai/dsh-* plus cordis/schemastery versions in the generated package.json
cat <dir>/package.json
```

## Drive script: a convenience shell for the free combination

`scripts/drive-questionnaire.mjs` (shipped with this skill) is a thin shell over the CLI's
native free-combination entry: parameters → native CLI flags → generate, plus "derive the
files that should exist from what you picked and self-check them; missing files exit
non-zero" and a JSON summary. Calling the CLI directly works just as well.

> Evolution: this script originally *drove the interactive questionnaire* (the CLI had no
> free-combination flags then, so the clack key semantics had to be reverse-engineered). Once
> the CLI had a native entry, the key-driving half was deleted — taking with it the brittle
> "the prompt text is the sync anchor, so a CLI wording change breaks it" problem.

```sh
node scripts/drive-questionnaire.mjs --dir <project-dir> --target <latest|next> \
  --atoms <tool,events,service,ui,protocol> \
  [--events <tools,agent,session,approval,fs,settings>] \
  [--surfaces <settings-card,chat-node,input-dock,sidebar,tool-view,session-header>] \
  [--seams <llm,systemPrompt,subagents,web,commands,storage>] [--create-service] \
  --tool-name <tool-name> \
  [--description <text>] [--author <author>] [--pkg-name <name>] [--plugin-id <plugin id>] \
  [--pkg-position <bundle|library>] [--config <none|static|dynamic>] [--lang <zh|en>]
```

- **The capability catalog is not duplicated in the script**: the ids of atoms / event domains
  / UI surfaces / capability seams and the hard constraints (every surface needs the `ui`
  atom; `settings-card` cannot be `config=none`) all live on the CLI side
  (`src/core/capabilities.ts`, shared with MCP). The script doesn't re-implement them — a
  copied catalog drifts, and drift means "the CLI supports it but the script says it's
  illegal". Illegal ids and constraint violations are reported by the CLI (stable error
  codes).
- The script keeps only a few **policies stricter than the CLI's**: `tool` requires
  `--tool-name` (the CLI would fall back to `example_tool`, a placeholder name you'd have to
  fix by hand afterwards); `events` / `ui` / `service` require their matching catalog entry
  or `--create-service` (otherwise the JSON summary and the self-check can't tell which files
  that atom should produce).
- The script only calls the CLI and never edits the artifact: every generated file comes out
  of the generator, so there is nothing to hand-edit.
- After generating it self-checks: the files implied by what you picked (`src/tool.ts` /
  `src/events.ts` / `src/client/index.ts` …) must exist, otherwise it exits non-zero and
  lists them under `missingFiles`.
- `--dry-run` prints the command it would run, without running it.
- By default the script uses the bundled `dist/cli.mjs` from the same package; `--cli <path>`
  points it at a different CLI (handy for verifying a modified local build).
