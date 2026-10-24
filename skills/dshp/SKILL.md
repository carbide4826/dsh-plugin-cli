---
name: dshp
description: |
  Scaffold a DeepSeek Harness (dsh) plugin project with the dshp CLI, then verify it installs,
  type-checks, builds and loads into a dsh host. Use when the user asks to "create a dsh plugin",
  "scaffold a plugin for DeepSeek Harness", "生成 dsh 插件", "写个 dsh 插件骨架", "起一个 dsh 插件",
  mentions dshp or create-dsh-plugin-cli, or wants a new dsh plugin project started from scratch.
  Do NOT use for editing an existing dsh plugin's source code, for developing the dsh host itself,
  or for plugins of other frameworks.
---

# dshp — scaffold a dsh plugin project

`dshp` (npm package `create-dsh-plugin-cli`) generates a DeepSeek Harness plugin project
skeleton. The result installs, type-checks and builds with `pnpm install && pnpm typecheck &&
pnpm build`, then loads into a dsh host via `dsh web --patch`.

This skill covers "generate a dsh plugin project from scratch"; editing an existing plugin's
code does not go through it.

> This document is written for models, not humans. Ask the user **in the language they use** —
> the question templates below are shapes to adapt, not scripts to recite.

## Core: this is an interview, not a fill-in-the-blank form

`dshp create`'s parameter table is meant for someone who already knows what they want. Hand it
to a user as-is and they cannot answer "which atoms should I tick" — so they either skip
everything or tick things at random, and the result is wrong and needs redoing.

So the main flow here is **interview first, generate second**. The rules are semantic only;
the tooling is yours to choose:

- **Confirm one item at a time**: one item (or a few) per turn, and every item must be
  individually skippable. Structured questionnaire or plain conversation — your call. What
  matters is that the user can tell which items are required and which can be skipped, so
  don't flatten a dozen questions into one wall of text.
- **Skip = leave that key empty** and fall back to the CLI default (the checklist states what
  each skip means). If the user says "you decide", skip the whole thing — don't keep asking.
- **Order options by relevance**: put the ones matching the user's description first and say
  **why** you recommend them; list the rest after. The user should see their own need at the top.
- **Advise, don't decide for the user**: a recommendation needs a reason and must stay
  changeable. Only decide on your own after the user explicitly says "go with yours".
- **Don't act until you have enough.** Keep asking rather than scaffolding something wrong.

## Prerequisite: this flow depends on the dshp CLI

The interview checklist and the generation rules **live in the CLI** (`src/core/spec.ts`, one
source shared by the CLI, MCP and this skill). Therefore:

| What you need | Where to get it | What happens without it |
| --- | --- | --- |
| Interview checklist (what to ask, what is skippable) | `dshp spec --json` | You can only fall back to this skill's snapshot → the checklist may be stale → **the generated plugin is not guaranteed to be spec-compliant** |
| What is selectable (presets / curated cases / atoms / event domains / UI surfaces / capability seams) | `dshp list --json` | Same |
| Generation | `dshp create` / MCP `dshp_create_plugin` | Nothing can be generated |

⚠️ **Without a dshp CLI (or with one too old to have the `spec` subcommand), do not hand-write
parameters from this skill's snapshot.** The atoms, surface dependencies and pinned dependency
versions may all be wrong that way — the result would *look* right without *being* right.
The correct move is to **tell the user**: generating to spec requires a dshp CLI that has the
`spec` subcommand (npm package `create-dsh-plugin-cli`), and offer the install options
(`npm i -g create-dsh-plugin-cli`, or letting the user run
`npx -y create-dsh-plugin-cli@latest <subcommand>` themselves). **Whether to install is the
user's decision — do not install it automatically.**

⚠️ **Do not recite the checklist from memory.** It changes as the CLI gains options; take what
to ask and what is skippable from the two sources above, live. `dshp list --json` answers "what
can I pick", `dshp spec --json` answers "what do I have to ask" — you need both.

The step-by-step checklist (how to ask / what skipping means / spec key → CLI parameter) is in
[references/interview.md](references/interview.md) — **that is a snapshot, a fallback for when
the CLI is unavailable**.

## Procedure

### 0. Environment check (if MCP is available, run it first)

If the host has MCP mounted, run `dshp_doctor` first: node version, pnpm, the dsh CLI, both
tracks' materials and generation-pipeline self-checks, and whether the current directory is
writable. **Don't start the interview if the environment is broken** — asking a dozen questions
only to discover the dependencies won't install wastes the user's time. Without MCP, skip this
step; environment problems surface at install time in step 7.

### 1. Ask what the plugin is for (open-ended, one sentence)

Ask one open-ended question so the user can say what the plugin is for (pick your own tool to
ask it with — use a structured question capability if you have one, plain conversation if you
don't):

> What should this plugin do? One sentence is enough (for example: "look up orders", "accept an
> external webhook", "add a settings card")

**Do not offer options at this step.** Every later choice depends on the answer — asking the
need first and giving advice afterwards is the right order; the reverse forces the user to
hunt through a list to find their own requirement.

### 2. Advise and pick a route (template vs custom)

Once you have the need, present **both routes** with a comparison and let the user choose:

| Route | Fits when | What you get |
| --- | --- | --- |
| Template | The need is close to an existing shape ("look up orders" → `quick-tool`; "accept an external webhook" → `webhook-bridge`) | A real project copied as-is with its identity rewritten — **zero manual edits** |
| Custom | You need a precise capability combination, or the need falls between the two | Pure generator output (also zero manual edits), but you define the combination item by item |

Template route → step 3; custom route → step 4.

> Don't skip the advice and ask straight away "which template?". **A recommendation needs a
> reason** ("you said you want to look up orders — `quick-tool` *is* a custom query tool plus a
> result card"), so the user can push back.

### 3. Template route: list the candidates, let the user pick

Take the ready-made presets and curated cases from `dshp list --json` (the two tracks may ship
different case sets — read the one matching your target track). **Put the ones matching the
need first**, then sort the rest by relevance:

> Recommended: `quick-tool` — you want to look up orders, and this case *is* a custom query tool
> plus a result card; tool and UI both come ready.
> Other options: `model-gateway` (bring your own model service), `webhook-bridge` (bridge
> external events into the session), `notebook` (per-user data storage), `session-bot` (watch
> sessions and auto-respond).

Once the user picks, record `template` and `templateKind` (preset / curated case) and jump to
step 5.

### 4. Custom route: atoms first, then follow up per atom

**Ask for atoms first** — atoms decide the plugin's capability surface (tool / events / service /
UI / protocol). Options come from the `atoms` list of `dshp list --json`; **put the ones
matching the need first and say why**, list the rest after:

> Recommended: `tool` (you want to expose a lookup capability) and `ui` (you want to show
> results in the session).
> Other options: `events` (subscribe to host events), `service` (extend capability seams),
> `protocol` (serve an HTTP endpoint).

⚠️ **Every UI surface requires the `ui` atom** (`tool-view` additionally needs `tool`): the
surface implementations are produced by the `ui` atom, so a surface picked without it is
**silently dropped** and the generated project has no `client/` at all.

After the atoms are settled, follow up per atom (don't ask about capabilities that weren't
picked):

| Picked | Then ask | Spec key |
| --- | --- | --- |
| `events` | Which event domains to subscribe to | `eventDomains` |
| `ui` | Which host UI surfaces to mount | `uiSurfaces` |
| `service` | Which capability seams to extend / whether to create your own service | `serviceSeams` / `newService` |
| `tool` | What the tool is called | `toolName` |

### 5. Ask the details one by one (every item is skippable)

These decide what the project looks like, what it's called and where it lands. **Confirm them
one by one** (you may bundle a few into one question, but each must stay individually
skippable), and tell the user what skipping means for each:

| Ask | Spec key | Skipping means |
| --- | --- | --- |
| Where should the project go, and what is it called? | `dirName` | The default name under the current directory (presets use e.g. `my-tool`, curated cases use the case id, custom combinations use `my-plugin`) |
| What npm package name? | `pkgName` | Same as the plugin id |
| What plugin id? | `pluginId` | Same as the directory name |
| Package position (bundle / library)? | `pkgPosition` | `bundle` |
| Which generation of the dsh host does it target? | `target` | `latest` |
| Any configuration, and how? | `config` | Derived from the chosen surfaces (`none` when there are none) |
| Plugin description / author | `description` / `author` | The preset's default / empty |
| Which language for the generated project? | `lang` | Auto-detected from the environment |

⚠️ **Be explicit about the output location**: the project is created under the **current
working directory**. A relative `dirName` (e.g. `apps/my-orders`) lands in that subdirectory of
the cwd; an absolute path lands exactly there. An existing directory is a hard failure — don't
pre-create a placeholder and then generate into it.

⚠️ **Config mode conflicts with surfaces**: with the `settings-card` surface you cannot use
`config: none` (a settings card must have something to show). Offer only `static` / `dynamic`
in that case.

⚠️ **Give the description and author up front**: changing them later means editing both
`package.json` and `locale/*.json`.

### 6. Complete → compile into parameters → generate

After the interview, run the gap check to confirm you have enough (`dshp spec --json` or MCP
`dshp_spec`, passing the collected spec; `ready` must be true before you start). If it isn't,
keep asking the remaining items.

Then compile the spec into CLI parameters and generate — **the parameter shape is exactly what
the CLI expects**:

```sh
npx create-dsh-plugin-cli create <dir> [capability params] [--target <latest|next>] [--lang <zh|en>] ...
```

- Template route: `--template <preset>` or `-s --template <case>`
- Custom route: `--atoms <list>` / `--event-domains <list>` / `--ui-surfaces <list>` /
  `--service-seams <list>` / `--new-service` / `--tool-name <name>` / `--config <mode>`
- `-s` requires `--template`; giving `-s` alone errors out.

⚠️ **Give `--atoms ""` even when the custom route picks no atom at all** (an empty value still
takes the non-interactive path — without it you fall into the interactive questionnaire).

When the host has MCP, use `dshp_create_plugin` instead of the command line: its input mirrors
the CLI parameters, and **it only computes a plan by default — call it again with an explicit
`dryRun: false` to write to disk**.

### 7. Three verification steps (skipping them means verifying nothing)

```sh
cd <dir>
pnpm install
pnpm typecheck
pnpm build
```

- `pnpm install` may be blocked by pnpm over dependency build scripts (it reports
  `ERR_PNPM_IGNORED_BUILDS`). pnpm 11 defaults to `strict-dep-builds: true`, so a skipped
  build script **makes install fail outright** (it is not a warning). Follow the prompt and
  run `pnpm approve-builds`; pnpm writes the pending entries into the generated project's
  `pnpm-workspace.yaml` under `allowBuilds` (placeholder value `set this to true or false`) —
  fill in `true`. **The allowlist splits into two groups**:
  - Installing the plugin's own dependencies (`pnpm install`): **only plugins that use llm
    capabilities** have to deal with `@google/genai` and `protobufjs` (pulled in via
    `dsh-llm-pi-ai → pi-ai`). Those two packages' scripts **are no-ops** — the official dsh
    `pnpm-workspace.yaml` itself lists them as `false` and notes "no-ops we don't need, so we
    deny them — install still succeeds", so **fill in `false` like the official one does**
    (the scripts are refused; install still succeeds). But **leaving them out fails just the
    same**, so they must be listed. Plugins that don't use llm see zero blocks at this step.
  - Installing the host CLI (`pnpm add -D @deepseek-ai/dsh`): `@deepseek-ai/dsh-subprocess-local`
    / `koffi` / `node-pty` **really do run** (native module builds / the spawn helper) — pick
    `true`.
  - ⚠️ `pnpm approve-builds` can only write `true` (the official plugin page's "allow these
    scripts and retry" also writes only `true`); to "refuse the script without failing
    install" you have to hand-write the `allowBuilds` section of `pnpm-workspace.yaml`.
- ⭐ **Run typecheck inside the project directory with all dependencies installed.** When the
  type-providing packages aren't in node_modules, `tsc`'s `skipLibCheck` swallows the
  resolution failure and the types degrade to `any`, so **typecheck goes green for the wrong
  reason** — old broken code "passes" in an environment without dependencies. So: install
  first, then typecheck; never typecheck in a directory without dependencies.
- A `pnpm build` failure is usually a UI project whose CSS pipeline is missing
  `@tsdown/css` (the generated project already ships it — if it won't install, install itself
  didn't succeed).

### 8. Install the host and integrate

```sh
pnpm add -D @deepseek-ai/dsh@<version>     # take the version from the generated package.json's pinned @deepseek-ai/dsh-*
```

⚠️ **Don't just install npm's `latest`.** The generated project pins its peer exactly, and the
host gate checks with `semver.satisfies(..., includePrerelease)` — the wrong version means
"rejected at preflight, nothing was installed". Upstream dist-tags roll (as of 2026-10-20 both
latest and next were `0.2.1-rc.2`, and both of this repo's tracks are on that version), but
**once upstream rolls again the artifact's peer stays on the old version and the new host
rejects it**. Take the version from the generated `package.json`.

Smoke test (don't start it — just confirm the composition tree has your plugin's entry):

```sh
pnpm dsh web --patch ./dev.patch.yml --dump-config | grep -A 4 <plugin-id>
```

Seeing the plugin entry means it loaded. Then pick one way to run it:

- **Load the sources directly (during development)**: `pnpm dsh web --patch ./dev.patch.yml`.
  Source edits take effect immediately.
- **Install the artifact (before publishing)**: `pnpm dsh plugin --profile web add .`, then
  `pnpm dsh web`.
  ⭐ **Plugins with UI surfaces must use this one**: a `--patch` load has no npm package
  identity, so the browser side never registers the slot and the surfaces silently don't
  render.

`dev.patch.yml` is a generated artifact holding an absolute path to your machine; it is in
`.gitignore` — don't commit it, don't hand-edit it.

### 9. Report

Tell the user: what was generated (directory + which route + which template or atom
combination + which track), which interview items were skipped (and what default each skip
implied), how far verification got (dependencies / types / build / composition tree), and how
to start it. If a step didn't succeed, say which one and why.

## Failure handling

| Symptom | Root cause | Fix |
| --- | --- | --- |
| `ERR_PNPM_IGNORED_BUILDS` | pnpm blocked a dependency's build script | `pnpm approve-builds` and allow the packages it lists |
| typecheck reports `Cannot find module` | The type packages aren't installed, or you ran it in the wrong directory | Go back to the project directory, confirm install succeeded, then re-run |
| typecheck is green but the code is obviously wrong | Without dependencies, `skipLibCheck` swallows resolution failures (false green) | Re-run where the dependencies are installed; only then is green real |
| `ctx.slots` type errors / diverging Config types | A second instance of cordis or schemastery | Dependency versions must match the official meta-package exactly or by tilde — never loosen them to a floating range |
| A UI surface doesn't render in the Web UI | You only used the `--patch` load | `pnpm build` + `pnpm dsh plugin --profile web add .` |
| `dsh plugin add` is rejected | The host's peer gate compares the dsh / dsh-* entries in peerDependencies | Install a host version matching the artifact's pinned peer; if you truly need a cross-version install, pair it exactly with `dsh plugin allow-version` |
| The generator reports the directory already exists | An occupied directory is a failure state | Pick another directory name; never overwrite |
| `SURFACE_REQUIRES_ATOM` | A surface was picked without the `ui` atom (`tool-view` also needs `tool`) | Add the atom, or drop the surface |
| Port in use at startup / a foreign plugin shows up | The `web` profile is shared | Isolate it with a profile of your own |

For deeper troubleshooting (contract changes, dependency pinning rules, gate semantics) see
references/host-contracts.md.

## Fact-checking discipline

The version numbers, slot keys, package names and checklist entries in this skill and its
three references are **snapshots**; they go stale as upstream rolls. For anything about "what
does the host do now" or "what can I pick now", don't rely on the snapshot alone — read the
source, it costs little:

- **What to ask and what is skippable**: `dshp spec` / `dshp spec --json` (the authoritative
  live checklist) — interview steps, how to ask them, what skipping means, where the options
  come from.
- **What is selectable**: `dshp list` / `dshp list --json` — presets / curated cases / atoms /
  event domains / UI surfaces / capability seams / both tracks' version pairing.
- Host contracts and slot definitions: the `dsh-fork` repo's
  `packages/client/**/slot-contract.ts` and
  `packages/boot/app-boot/src/plugin-compatibility.ts` (the gating rules).
- Dependency pairing: `npm view @deepseek-ai/dsh@<version> dependencies`.
- Toolchain behaviour: your local pnpm implementation (e.g. which entries `allowBuilds` and
  `onlyBuiltDependencies` actually honour).

When the snapshot is stale, go with what you read at that moment and mention the difference in
your answer to the user.

**When the CLI is unavailable** (dshp isn't installed, or the installed one is too old to have
`spec` / `list`): the snapshots in this skill and its references are all you have. Then:

- **Tell the user plainly that you're working from a snapshot that may be stale** — don't let
  it pass as "the current spec".
- Don't hand-write parameters from the snapshot. A snapshot can produce a plugin that *looks*
  right without *being* right: the atom set, the surface dependencies and the pinned
  dependency versions may all have changed.
- The right move is to spell out what's needed, what breaks without it, and let the user
  decide whether to install a dshp CLI that has the `spec` subcommand (npm package
  `create-dsh-plugin-cli`). **Do not install it automatically.**

## Examples

Complete interview transcripts (need → item-by-item Q&A → collected spec → compiled command →
verification) live in [references/examples.md](references/examples.md) — that is the **golden
set**: every case carries an executable spec and its compiled result, and a guard test checks
them against the compiler, so the commands there are ones that really run. Copying them won't
break.

Three abridged versions are also here:

Input: "set up a dsh plugin project that can look up orders"
Output: Ask what it's for → recommend "template route — `quick-tool` is a custom query tool
plus a result card" → user confirms → ask where to put it and what to call it (skip the rest)
→ `dshp create -s --template quick-tool my-orders --lang zh` → `pnpm install && pnpm typecheck
&& pnpm build` all pass → report the generated directory, the skipped items (package name and
plugin id default to the directory name) and the start command (`pnpm dsh web --patch
./dev.patch.yml`; if it needs a settings card, also `plugin add`).

Input: "use the next track for a plugin that accepts an external webhook"
Output: Need → recommend "`webhook-bridge` is exactly bridging external events into the
session; the next track pairs with dsh 0.2.1-rc.2" → once confirmed,
`dshp create -s --template webhook-bridge my-hook --target next --lang zh`, then steps 7 and 8;
when reporting, name the dsh version the next track currently pins (read it from the generated
package.json).

Input: "I want a plugin that takes an API key in a settings page and shows query results in the
session"
Output (custom route; the full item-by-item transcript is golden set case 3):
ask what it's for → recommend the custom route (no curated case fits) → atoms `tool` + `ui`
(matching ones first, with reasons) → surfaces `settings-card` + `tool-view` → tool name
`query_api_keys` → config mode offers only `dynamic` / `static` (`none` is impossible with a
settings card) → confirm the output location and naming item by item (skip the rest) → compile
to `dshp create --atoms tool,ui --ui-surfaces settings-card,tool-view --tool-name
query_api_keys --config dynamic my-api-keys --lang zh` → `pnpm install && pnpm typecheck &&
pnpm build` all pass → report: directory, atom and surface combination, and which default each
skipped item used. ⭐ With UI surfaces present, starting means `pnpm dsh plugin --profile web
add .` followed by `pnpm dsh web` — a `--patch` load doesn't register the slots, so the
surfaces silently don't render.

## Windows (win32) platform notes

Only macOS/Linux has been tested in practice; Windows is unverified. Equivalent commands:

- `grep` is unavailable → use `findstr /C:"<plugin-id>"`, or just read the full
  `--dump-config` output.
- `pnpm approve-builds` works interactively on Windows too; when it can't be interactive, edit
  the `onlyBuiltDependencies` / `allowBuilds` allowlist in `pnpm-workspace.yaml` directly.
- Path separator differences don't affect this skill's steps (the generator joins the paths
  itself), but the absolute path inside `dev.patch.yml` uses Windows style — mind that if you
  edit it by hand.
