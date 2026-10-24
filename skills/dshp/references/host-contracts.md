# Host contracts and troubleshooting notes

> The constraints imposed by the dsh host — most of them are "you learn them by hitting them".
> Read this before changing a generated project, adding dependencies, or integrating with a host.

## Track semantics

- The `latest` / `next` in `--target latest|next` are **stable container names**; they never
  change when the dsh version moves. A promotion only swaps the content (template tree +
  manifest), never the track name.
- A track and its manifest are paired strictly: each track has one complete template tree and
  one manifest (four fields: version / cordisPeer / schemasteryVersion / settingsSlot), so
  generation does zero parsing and zero fallback.
- Both tracks currently pin dsh `0.2.1-rc.2` (a snapshot value — the generated
  `package.json` is the authority).
- The generated project's peer version must **match** the host's dsh version, or the host's
  gate rejects it outright (see below).

## Dependency pinning rules (the class of incident that keeps coming back)

**Rule: every `@deepseek-ai/*` runtime dependency must be aligned with the official dsh
meta-package's declaration (exact version or tilde). Never write a floating range yourself.**

Mechanism: a floating range lets the install tree produce a **second instance of the same
package**. Example: the generated peer says `^4.0.2` while the meta-package pins `4.0.2`
exactly, so pnpm may bind the client-ui packages to a stray `4.0.4` instance; the
`declare module` merge lands in 4.0.4's `Context` while type checking reads the other one →
`ctx.slots` reports `TS2339`.

The same disease is subtler on schemastery: the meta-package pins `3.18.2` exactly, a curated
case writes `^3.18.2` and drifts to `3.18.4`, the `Config` schema types diverge → the port
schema in the webhook scenario fails typecheck outright.

Two directions that were actually measured:

- The official meta-package uses **exact pins / tilde alignment** for third-party dependencies
  (read from 0.2.1-rc.2: `cordis ~4.0.5` / `schemastery ~3.18.5` / `loader ~1.0.6` /
  `timer ~1.1.7` / `include ~1.0.10`); the earlier version lines (e.g. 0.1.5-rc.2) pinned
  everything exactly (`cordis 4.0.2` / `schemastery 3.18.2` / `loader 1.0.3` /
  `hmr 1.0.17` / `timer 1.1.4` / `include 1.0.7`).
- **Do not** write overrides for these packages in the template's `pnpm-workspace.yaml` — the
  official meta-package already pins them exactly, and adding overrides creates a second
  instance that disagrees with the official declaration.

After changing dependencies, first confirm the install tree has a single instance; only then
talk about whether typecheck is green.

## Typecheck going green for the wrong reason (silent failure)

The type-providing packages (`dsh-client-ui-slots` / `dsh-client-ui-chat` /
`dsh-client-ui-conversation`) may not be in the generated project's node_modules — type
resolution sometimes works only because an ancestor directory happens to have dsh installed.
Then `tsc`'s `skipLibCheck` swallows the resolution failure, the types degrade to `any`, and
**typecheck goes green for the wrong reason**: old broken code "passes".

So typecheck only counts in a **clean environment with all dependencies installed**. The same
applies to running typecheck on a generated project in CI — a clean runner is where the
problem surfaces earliest.

## Contract changes since 0.1.7

| Change | Impact | The current way to write it |
| --- | --- | --- |
| The `settings.plugin.item` slot key was deleted repo-wide | The old settings-card entry point is gone | Use `settings.plugins.tab` (the Plugins tab slot) instead: `ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({name, id, order, label}, Component))`; the slot's type declaration lives in the `dsh-client-ui-settings` package |
| `installSection` was removed | Dynamic config has no legacy wiring | Use the module's `Config` export instead, which the host projects into a form natively; fields that must hot-update go through the `.volatile()` chain (save → write a profile patch → re-run apply) |
| The shared `'plugin'` kind was removed from `MessageSourceMap` | Messages produced by a plugin have no owning kind | The plugin declares its own kind with `declare module` in its own module (the official webhook declares `'webhook'` the same way); the generated project uses `'plugin-notice'` |

## Host gate (plugin add / load)

- The gate **only inspects the `dsh` / `dsh-*` entries in peerDependencies** — cordis and
  schemastery don't take part.
- The check uses `semver.satisfies(..., includePrerelease)`; not satisfying it is a **hard
  reject**: the `add` preflight refuses, and loading throws again.
- ⚠️ **Upstream dist-tags roll, but this repo's two manifests don't follow automatically**
  (the canary only reports, it never acts — the rules are in
  `docs/UPSTREAM-VERSION-POLICY.md`). Measured (2026-10-20): on npm both `latest` and `next`
  were `0.2.1-rc.2` (cordis `~4.0.5`), and both of this repo's manifests had been promoted
  to that same version. **Once upstream rolls again, neither track follows** — the generated
  project's peer is still the old version, and installing a new host gets hard-rejected
  (`0.2.2-rc.x` does not satisfy peer `0.2.1-rc.2`). So always **install the host version
  pinned in the generated package.json**, never a bare `latest`.
- Escape hatch: `dsh plugin allow-version` for an exact pairing.
- ⚠️ **The version of the dsh CLI in the project you run `add` in is the judge** — not the
  version of the project under test. Don't run `add` from inside the project under test to
  learn about host behaviour.
- Peer ranges across prereleases have a trap: under npm's semver rules for the same tuple,
  `>=0.1.5-rc.2` does **not** match `0.1.7-rc.2`; covering several prerelease generations
  needs an OR range.

## Toolchain behaviour (pnpm)

- pnpm 11 defaults to `strict-dep-builds: true`: a skipped dependency build script **throws
  `IgnoredBuildsError` and fails the install** — it is not a warning.
- pnpm 11 uses `allowBuilds` (measured in its bundle: `allowBuilds` appears 75 times,
  `onlyBuiltDependencies` only 6); pnpm writes the pending entries into the project's
  `pnpm-workspace.yaml`, and `true` lets the script run, while `false` also lets the install
  through but skips compiling the native module.
- **The allowlist splits into two groups — don't mix them** (measured on 2026-10-20 with
  `pnpm add -D @deepseek-ai/dsh@0.2.1-rc.2`, which reported
  `Ignored build scripts: @deepseek-ai/dsh-subprocess-local@0.2.1-rc.2, @google/genai@2.21.0,
  koffi@3.1.1, node-pty@1.2.0-beta.15, protobufjs@7.6.6`):
  - **Installing the host CLI** (`pnpm add -D @deepseek-ai/dsh`) brings in `dsh-subprocess-local`
    (its postinstall installs the spawn helper), plus `koffi` and `node-pty` (native modules,
    pulled in via `dsh-subprocess-local`) — these three **really run, so fill in `true`**; and
    also `@google/genai` / `protobufjs`.
  - **Installing the plugin's own dependencies** (`pnpm install`) only brings in `@google/genai`
    and `protobufjs` for plugins that **use llm capabilities** (via `dsh-llm-pi-ai → pi-ai`);
    plugins that don't use llm measured zero blocks.
  - ⭐ **The `@google/genai` / `protobufjs` scripts are no-ops, and the official line is "list
    them and fill in `false` to refuse execution"** — dsh's own `pnpm-workspace.yaml` writes
    `'@google/genai': false` / `protobufjs: false`, with the comment "pnpm lists them only
    because they ship lifecycle scripts, but those are no-ops we don't need, so we deny them —
    install still succeeds". **But they must be listed**: leaving them out is a hard
    `ERR_PNPM_IGNORED_BUILDS` failure (measured exit=1); listing them with `false` gives
    install exit=0.
    ⚠️ `pnpm approve-builds` can only write `true` (the official GUI's `approveBuilds()` also
    writes only `true`), so refusing execution means hand-writing the `allowBuilds` section
    of `pnpm-workspace.yaml`.
- `auto-install-peers: true` by default: peer dependencies get installed automatically — but
  this repo's artifacts pin the versions exactly, so the lockfile doesn't float. **Don't
  change them to `^` by hand** (that collides with the host's peer gate).

## Publishing metadata (read by the host's plugin management page)

The host aggregates each package's client entry by npm package identity and reads the
metadata inside the package:

- `package.json`'s `icon` (a path relative to the package, an SVG of at most 256KiB) → the
  big icon on the detail page.
- The `meta` in `locale/<lang>.json` (name / description, bilingual) → the detail page copy;
  with no dictionary it falls back to the package.json text, and the `en` fallback is
  mandatory.
- `exports` must be able to resolve `"./package.json"` and `"./locale/*.json"`, or the whole
  metadata pipeline falls back.
- The `files` allowlist must list `dist` and the other artifacts explicitly, or npm falls
  back to `.gitignore` as a denylist and the artifact ships incomplete.
- The host reads the locale dictionary in **the host's own language**, not the agent's.

## Real-machine verification criteria

- The dsh CLI honours the `DSH_HOME` environment variable to relocate the profile root — use
  a temporary home for isolated verification and don't touch the user's real profile (it may
  have its own problems, e.g. a missing bundle or settings.yaml, that block startup).
- The bare top-level `dsh` needs an explicit `--profile`; the `dsh web` subcommand takes a
  positional argument: `pnpm dsh web --patch ./dev.patch.yml --dump-config`.
- **The criterion for "loaded into the composition tree"**: the `--dump-config` output
  contains this plugin's entry (grep the plugin id).
- The criterion on the UI side: the Web UI in the browser renders the corresponding surface
  and the console has no errors.
  - A surface needs `pnpm build` + `pnpm dsh plugin --profile web add .`; a `--patch` load
    has no package identity, so the browser side never registers the slot.
  - After killing the previous service, the leftover page's WebSocket/SSE reconnect reports
    `ERR_CONNECTION_REFUSED` in the console, which pollutes the next verdict — navigate the
    old page away before attaching the listener.

## Three identities that must match

The directory name, `package.json`'s `name`, and `export const name` in `src/index.ts` are
the same value by default; the `- id:` (plugin id) and `name:` (module name) in
`cordis.patch.yml` must be synced too, and a UI project also has the client id in
`tsdown.config.ts`. Missing one leaves the identity misaligned. `dshp create` already
rewrites all of them, but **when renaming, change all of them together** — never just one.
