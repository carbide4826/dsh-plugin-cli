# Interview checklist and generation spec

> This file is a **snapshot**, used as a fallback only when the dshp CLI is unavailable — the
> checklist changes as the CLI gains options. With the CLI at hand, take the live values from
> `dshp spec --json` (see "Live discovery" at the end).
>
> ⚠️ Hand-writing parameters from this snapshot without the CLI produces a plugin that *looks*
> right without *being* right: the atom set, the surface dependencies and the pinned dependency
> versions may all have changed. In that case tell the user they need a dshp CLI with the
> `spec` subcommand (npm package `create-dsh-plugin-cli`), and let them decide whether to
> install it — **don't install it automatically**.

## Why an interview and not a fill-in-the-blank form

`dshp create`'s parameter table is meant for someone who already knows what they want. Hand it
to a user as-is and they cannot answer "which atoms should I tick" — so they either skip
everything or tick things at random, and the result is wrong and needs redoing.

The rules of the interview (details in SKILL.md):

- **Confirm one item at a time**: one item (or a few) per turn, and every item must be
  individually skippable. Structured questionnaire or plain conversation is your call — what
  matters is that the user can tell which items are required and which can be skipped.
- **Every item carries a "skip"**: skipping = leaving that key empty = falling back to the
  CLI default.
- **Order options by relevance**: the ones matching the need go first, with a reason for the
  recommendation.
- **Don't act until you have enough** (spec.ready is true).

## Step checklist (order = the suggested question order)

Annotations: `[preset/case/free]` = asked only on that route; rows marked skippable state what
skipping implies. "Step id" is a stable identifier (skip records and gap checks key off it).

| # | Step id | Question | Spec key | Required | Skipping means | Applies to |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `need` | What should this plugin do? (open-ended, no options) | `need` | ✓ | — | all |
| 2 | `route` | A ready-made template, or your own capability combination? | `route` | ✓ | — | all |
| 3 | `template` | Which template? | `template` + `templateKind` | ✓ | — | `[preset/case]` |
| 4 | `atoms` | Which capability atoms do you want? | `atoms` | ✓ | — | `[free]` |
| 5 | `domains` | Which event domains to subscribe to? | `eventDomains` | skippable | Subscribe to nothing | `[free]` and `events` picked |
| 6 | `surfaces` | Which host UI surfaces to mount? | `uiSurfaces` | skippable | No UI at all | `[free]` and `ui` picked |
| 7 | `seams` | Which capability seams to extend? | `serviceSeams` | skippable | Extend nothing | `[free]` and `service` picked |
| 8 | `newService` | Create your own service? | `newService` | skippable | Don't create one | `[free]` and `service` picked |
| 9 | `toolName` | What is the tool called? | `toolName` | skippable | `example_tool` | `[free]` and `tool` picked |
| 10 | `config` | Any configuration, and how? | `config` | skippable | Derived from the chosen surfaces (`none` when there are none) | all |
| 11 | `dirName` | Where should the project go, and what is it called? | `dirName` | skippable | The default name under the current directory | all |
| 12 | `pkgName` | What npm package name? | `pkgName` | skippable | Same as the plugin id | all |
| 13 | `pluginId` | What plugin id? | `pluginId` | skippable | Same as the directory name | all |
| 14 | `pkgPosition` | Package position (bundle / library)? | `pkgPosition` | skippable | `bundle` | all |
| 15 | `target` | Which generation of the dsh host does it target? | `target` | skippable | `latest` | all |
| 16 | `description` | Plugin description? | `description` | skippable | The preset's default (empty for custom combinations) | all |
| 17 | `author` | Author? | `author` | skippable | Empty | all |
| 18 | `lang` | Which language for the generated project? | `lang` | skippable | Auto-detected from the environment | all |

The atom list for step 4 (options taken live, from the `atoms` list of `dshp list --json`):

`tool` (expose a tool) · `events` (subscribe to host events) · `service` (extend capability
seams) · `ui` (host UI surfaces) · `protocol` (HTTP protocol endpoint)

⚠️ **Every UI surface requires the `ui` atom** (`tool-view` additionally needs `tool`): the
surface implementations are produced by the `ui` atom, so a surface picked without it is
**silently dropped** and the generated project has no `client/` at all.

## Spec key → CLI parameter

The spec's keys mirror `dshp create`'s parameters, so one spec compiles into two shapes:

| Spec key | CLI parameter | create tool input |
| --- | --- | --- |
| `mode: "preset"` + `template` | `--template <id>` | `mode: "preset"`, `preset: <id>` |
| `mode: "case"` + `template` | `-s --template <id>` | `mode: "case"`, `case: <id>` |
| `mode: "free"` + `atoms` | `--atoms <a,b>` | `atoms: [...]` |
| `eventDomains` | `--event-domains <a,b>` | `eventDomains` |
| `uiSurfaces` | `--ui-surfaces <a,b>` | `uiSurfaces` |
| `serviceSeams` | `--service-seams <a,b>` | `serviceSeams` |
| `newService: true` | `--new-service` | `newService` |
| `toolName` | `--tool-name <name>` | `toolName` |
| `config` | `--config <mode>` | `config` |
| `dirName` | positional argument | `dirName` |
| `pkgName` | `--pkg-name <name>` | `pkgName` |
| `pluginId` | `--plugin-id <id>` | `pluginId` |
| `description` | `--description <text>` | `description` |
| `author` | `--author <name>` | `author` |
| `pkgPosition` | `--pkg-position <p>` | `pkgPosition` |
| `target` | `--target <track>` | `target` |
| `lang` | `--lang <zh\|en>` | `lang` |

⚠️ **Give `--atoms ""` even when the custom route picks no atom at all** — an empty value is
still the non-interactive path; without it you fall into the interactive questionnaire.

## How to record a skip

Record skipped steps by **step id** in `skipped` (e.g. `skipped: ["author", "description"]`).
Step ids are in the "Step id" column above (`need` / `route` / `template` / `atoms` / …).
Skipping them isn't required — the gap check only looks at "does this key have a value" — but
recording them shows which items the user actively skipped, so your report can say "skipped X,
therefore Y default was used".

## Using it from MCP

`dshp_spec` tool input: `spec` (the spec collected so far, keys as above) + `mode` (restrict to
one route).

Returns:

| Field | Meaning |
| --- | --- |
| `steps[]` | All steps + the live options + each step's status (`pending` / `answered`) |
| `next` | The next question (the one to ask) |
| `pending[]` / `requiredPending[]` | What still needs asking / the required part of it |
| `ready` | All required items are in — you may start |
| `cliArgs` / `createArgs` | The compiled parameters once you're ready (both shapes) |

Typical loop: call once with an empty spec to get the first question → after each answered
step, merge the answer into the spec and call again → once `ready` is true, call
`dshp_create_plugin` with `createArgs` (it only computes a plan by default; call it again with
an explicit `dryRun: false` to write to disk).

## Live discovery (takes precedence over this snapshot)

```sh
dshp spec            # human-readable: the interview checklist
dshp spec --json     # machine-readable: steps + how to ask + skip semantics + options
dshp spec --mode free  # only the steps of the custom route
dshp list --json     # what is selectable (presets / curated cases / atoms / event domains / surfaces / seams)
```

With MCP mounted, the same two things are the `dshp_spec` and `dshp_list_scenarios` tools.

⚠️ These commands need a dshp CLI **with the `spec` subcommand** (npm package
`create-dsh-plugin-cli`). Without it this file is only a fallback — **don't hand-write
parameters from it** (see the top of this file).
