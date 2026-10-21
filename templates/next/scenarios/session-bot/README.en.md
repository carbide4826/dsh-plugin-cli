# session-bot

Curated case: auto-respond in sessions (events + llm seam)

> Scaffolded by [dshp](https://github.com/carbide4826/dsh-plugin-cli) · DSH version __DSH_VERSION__

　　**Versions follow dsh**: all `@deepseek-ai/dsh-*` packages follow the DSH version line, currently pinned at __DSH_VERSION__; they will be updated as the official line moves.

　　**Node requirement**: `^22.19.0 || >=24.0.0`.

## Quick start

### 1. Install dependencies and build

```sh
pnpm install  # install dependencies (①)
pnpm build            # build
pnpm typecheck        # type check
```

### 2. Prerequisite: install dsh inside this project

　　Run in the **project root**:

```sh
pnpm add -D @deepseek-ai/dsh@__DSH_VERSION__  # install dsh (②)
```

### 3. Check without launching

> This uses the `--patch` injection from "option two" below for a one-off check that the plugin row makes it into the composition tree.

```sh
# without launching, check the composition tree contains this plugin row:
pnpm dsh web --patch ./dev.patch.yml --dump-config | grep -A 4 session-bot
```

### 4. Plugin injection (two options, pick one)

　　Both make the host aware of the plugin; the difference is "install the artifact" vs "load source directly".

#### Option 1 · plugin add (persistent, built artifacts)

　　Prerequisite: step 1 has run `pnpm build` (installs the `dist/` artifact; the loader resolves via `exports`).

```sh
pnpm dsh plugin --profile web add .      # run in the project root (④⑪)
pnpm dsh web                             # launch (everything from built artifacts)
```

#### Option 2 · one-off --patch injection (temporary, direct source load)

```sh
pnpm dsh web --patch ./dev.patch.yml  # launch (direct source load) (⑧⑨)
```

> During development use `--patch` to load .ts sources directly; `plugin add` installs built artifacts — the two tracks do not interfere.

　　After launch, the printed Web URL (default http://127.0.0.1:3080) means apply has run. To verify features: ask the model to call the tool in a conversation (a model must be configured); open the Web UI at the matching location for UI surfaces.

### Tips

　　① ~~**install hijacked by an ancestor workspace**: if a `pnpm-workspace.yaml` exists in a parent directory, `pnpm install` is hoisted to that workspace root and this project's `node_modules` is not created (typecheck fails with Cannot find module); install independently with `pnpm install --ignore-workspace`.~~ **The project root ships its own `pnpm-workspace.yaml` (for workspace bounding), so a plain `pnpm install` is fine.**

　　② **pnpm blocks dependency build scripts (supply-chain protection)**: pnpm 11 defaults to `strict-dep-builds`, and an unapproved build script makes `pnpm install` **fail outright** (not a warning). The two groups surface at different steps and are handled differently:

　　- **Step 1 `pnpm install` (the plugin's own dependencies)**: this plugin uses LLM capabilities, and `dsh-llm-pi-ai` pulls in `@google/genai` and `protobufjs`. Their scripts **are no-ops** (the official dsh `pnpm-workspace.yaml` marks them `false` with the note "no-ops we don't need, so we deny them — install still succeeds"), but **leaving them unlisted fails the install just the same** — list them with the value `false` (explicitly denied; install still succeeds).
　　- **Step 2 `pnpm add -D @deepseek-ai/dsh` (the host CLI)**: the host tree pulls in `@deepseek-ai/dsh-subprocess-local`, `koffi` and `node-pty` — those three **genuinely need to run** (native module builds / installing the spawn helper), so approve them with `true`. `@google/genai` / `protobufjs` are in that tree too (already handled with `false` in step 1, nothing more to do here).

　　> `pnpm approve-builds` can only set an entry to `true` (the official plugin page's "allow these scripts and retry" writes `true` too). To follow the official stance — deny execution without failing the install — hand-write the `allowBuilds` block in this project's `pnpm-workspace.yaml`: change pnpm's `set this to true or false` placeholder to `false`. The exact list changes with host versions; trust what `pnpm approve-builds` actually prints.

　　③ **UI surfaces only render via plugin add**: for client-half surfaces, `--patch` direct load only loads the host half and browser-side slot registration never happens (the host aggregates each package's client export by npm package identity; a file:// direct load has no package identity); you must `pnpm build` first, then `plugin add`.

　　④ **The web profile is shared**: adding multiple plugins into the web profile pollutes them into each other; use your own named profile when isolation is needed.

　　⑤ **Listening to session events requires `{ global: true }`**: `session/created` / `session/event` are dispatched inside the session fiber; plain listeners on the root context never receive them.

　　⑥ **Do not read `ctx.<service property>` inside global callbacks**: cordis checks access against the currently active plugin's inject; undeclared access throws `cannot get property … without inject`, and containment swallows it silently (logger.warn never reaches terminal stdout), which looks like "the event never arrived".

　　⑦ **Replies go through `session.append`, not `agent.followup`**: `agent.followup` means "queue input for the next turn" (it triggers another model call); it is not a reply channel.

　　⑧ **dev.patch.yml is a generated artifact**: produced by the CLI with machine-private absolute paths inside; it is excluded in `.gitignore` — do not commit or hand-edit it.

　　⑨ **Relative imports carry the full `.ts` suffix**: dev direct load goes through Node's native type stripping, so suffixes must match the file names exactly (registration layers `.ts`, React components `.tsx`).

　　⑩ **Project identity is three same-named fields**: the directory name (on-disk location), `name` in `package.json` (package identity), and `export const name` in `src/index.ts` (Cordis registration name) share the same value by default; renaming must change all three together, plus `- id:` (plugin id) and `name:` (module name, defaults to the package name) in `cordis.patch.yml` — miss one and the identity is misaligned (UI projects also have a client id inside `tsdown.config.ts`). Projects generated by `dshp create` are already rewritten automatically; no manual sync needed.

　　⑪ **After code changes, rebuild + re-add**: `plugin add` installs built artifacts; source changes do not take effect automatically — run `pnpm build` again and then `pnpm dsh plugin --profile web add .` (use "option two" direct load to see changes as you make them).

### What this case demonstrates

　　"Event-driven session response": listen to `session/event`, and on a trigger word **append a plugin-sourced reply** straight into the session log — no model call-out needed, no tool involved; the plugin acts on its own.

### Key files

| File | What to look at |
|---|---|
| `src/domains/session.ts` | event listening + trigger-word matching (see tip ⑤) |
| `src/service.ts` | reply delivery: `session.append` writes a plugin notice |
| `src/index.ts` | `inject: ['llm']` |

### How to verify it works

1. Follow quick start steps 1–4
2. Start a session and type **`/bot hello`** → a "context injection session-bot" entry appears in the trace tab, and the terminal prints `session created` at the same time

　　Adapt the project to your actual needs; it is a template skeleton and not recommended for production as-is.
