# Reference examples (golden set)

> This file holds **complete interview transcripts**: need → item-by-item Q&A → the collected
> spec → the compiled command → verification. They are there to be copied, not obeyed — you can
> adjust the wording, how many items you ask per turn, and which tool you ask with, to suit the
> application you are running in.
>
> ⭐ Every case carries an **executable spec** (JSON) and its **compiled command**. A guard test
> (`src/core/skillGolden.test.ts`) runs that spec through the compiler (`specToCliArgs`) and
> compares the result with the command written here, word for word — **an example that drifts
> from the compiler turns the test red**.
> So the commands here are ones that really run, not illustrations: copying them won't break.

## Question styles: three interchangeable shapes

The skill fixes the semantics only (confirm item by item, every item individually skippable, a
recommendation needs a reason, don't act until you have enough). **How you ask is yours to
choose.** Here are three shapes that all satisfy the rules — take the one your application
supports:

**Style A · Plain conversation, one item at a time** (works everywhere)

```
You: What should this plugin do?
User: Look up orders.
You: A ready-made template, or your own capability combination?
  Recommended: the template route — quick-tool is "a custom query tool plus a result card",
  which is exactly what you described.
User: Template.
You: Which template?
  1. quick-tool (recommended: looking up orders is precisely its job)
  2. notebook     3. model-gateway
User: The first one.
You: Where should the project go, and what is it called? (skippable, defaults to my-orders)
User: my-orders, and you decide the rest.
```

**Style B · Structured questionnaire** (when the application has a structured-question
capability — e.g. a questionnaire tool with a "skip" option: ask several items at once, each
carrying its own "skip")

```
[multi-select] Which capability atoms do you want?
  □ tool    expose a tool (recommended — you want to expose a lookup capability)
  □ ui      host UI surfaces (recommended — you want to show results in the session)
  □ events  subscribe to host events
  □ service extend capability seams
  □ protocol serve an HTTP endpoint
  [skip this question]

[text] What is the tool called?
  Preset: query_orders
  [skip this question]
```

**Style C · One batch of blanks, one reply** (efficient; "every item is individually skippable"
still holds)

```
Fill these in (anything left blank takes the default, and every line can be skipped):
  1. Directory name (default my-orders):______
  2. Package name (default = plugin id):______
  3. Plugin id (default = directory name):______
  4. Description (default = the preset's):______
  5. Author (default empty):______
  6. Target track (default latest):______
  7. Generated project language (default auto-detected):______
```

The three styles share only three things: **confirm item by item · every item can be skipped
on its own · when an item is skipped, say which default was used**.

---

## Case 1 · Template route · curated case quick-tool

**User**: "set up a dsh plugin project that can look up orders"

**Question style**: A (plain conversation, one item at a time)

**Interview transcript**:

> You: What should this plugin do?
> User: Look up orders.
> You: A ready-made template, or your own capability combination?
>   Recommended: **the template route** — `quick-tool` is "a custom query tool plus a result
>   card", which is what you described. You could build your own, but then the directory, the
>   surfaces and the rest all have to be decided item by item.
> User: Template.
> You: Which template? (the ones matching your need go first)
>   Recommended `quick-tool` — a custom query tool plus a result card.
>   Others: `model-gateway` (bring your own model service), `webhook-bridge` (bridge external
>   events into the session), `notebook` (per-user data storage), `session-bot` (watch sessions
>   and auto-respond).
> User: quick-tool.
> You: Where should the project go, and what is it called? (skip = the default name under the
> current directory, my-orders)
> User: my-orders, and you decide the rest.
> You: Which language for the generated project? (skip = auto-detected)
> User: Chinese.

**Collected spec**:

```json
{
  "need": "look up orders",
  "route": "template",
  "template": "quick-tool",
  "templateKind": "case",
  "dirName": "my-orders",
  "lang": "zh",
  "skipped": ["pkgName", "pluginId", "description", "author", "pkgPosition", "target"]
}
```

**Compiled command**:

```sh
dshp create -s --template quick-tool my-orders --lang zh
```

**Verification**: `cd my-orders && pnpm install && pnpm typecheck && pnpm build`, then
`pnpm dsh web --patch ./dev.patch.yml` (smoke-test that the composition tree has the plugin's
entry).

⚠️ The skipped items mean the defaults were used: the package name and plugin id default to
the directory name, the plugin id defaults to the directory name, the description uses the
case's default, the author is empty, and the target track is `latest`. Say exactly that in your
report.

---

## Case 2 · Template route · webhook-bridge on the next track

**User**: "use the next track for a plugin that accepts an external webhook"

**Question style**: A

**Interview transcript**:

> You: What should this plugin do?
> User: Accept an external webhook, and have it show up in the session.
> You: A ready-made template, or your own capability combination?
>   Recommended: **the template route** — the `webhook-bridge` case is exactly "bridging
>   external events into the session".
> User: Template, on the next track.
> You: Which template?
>   Recommended `webhook-bridge` (the next track pairs with dsh 0.2.1-rc.4).
> User: That one.
> You: Where should the project go, and what is it called?
> User: my-hook, and you decide the rest.

**Collected spec**:

```json
{
  "need": "accept an external webhook and show it in the session",
  "route": "template",
  "template": "webhook-bridge",
  "templateKind": "case",
  "dirName": "my-hook",
  "target": "next",
  "lang": "zh",
  "skipped": ["pkgName", "pluginId", "description", "author", "pkgPosition"]
}
```

**Compiled command**:

```sh
dshp create -s --template webhook-bridge my-hook --target next --lang zh
```

**Verification**: same as case 1; when reporting, name the dsh version the next track pins
(**read it from the generated package.json**, never from memory).

---

## Case 3 · Custom route · tool + settings card

**User**: "I want a plugin that takes an API key in a settings page and shows query results in
the session"

**Question style**: B (structured questionnaire)

**Interview transcript**:

> You: What should this plugin do?
> User: Take an API key in a settings page, and show the query results in the session.
> You: A ready-made template, or your own capability combination?
>   Recommended: **your own combination** — none of the curated cases fit (there is no "API key
>   in a settings page" shape), and what you want (a settings card + a tool + a result view)
>   can be assembled in one pass.
> User: My own.
> You: [multi-select] Which capability atoms do you want?
>   Recommended `tool` (something has to do the lookup) + `ui` (the settings page and the
>   result view are both UI surfaces, produced by it).
>   Others: `events`, `service`, `protocol`.
> User: tool and ui.
> You: [multi-select] Which host UI surfaces to mount?
>   Recommended `settings-card` (that's the settings page) + `tool-view` (where tool results
>   are shown).
>   Others: `chat-node`, `input-dock`, `sidebar`, `session-header`.
> User: Those two.
> You: [text] What is the tool called?
> User: query_api_keys.
> You: [single-select] Config mode? (with settings-card, `none` is impossible)
>   `dynamic` (the user edits the config in the settings page; changes apply on save) /
>   `static` (the config is baked into the package).
> User: dynamic.
> You: Where should the project go, and what is it called?
> User: my-api-keys, and you decide the rest.

**Collected spec**:

```json
{
  "need": "take an API key in a settings page and show query results in the session",
  "route": "custom",
  "atoms": ["tool", "ui"],
  "uiSurfaces": ["settings-card", "tool-view"],
  "toolName": "query_api_keys",
  "config": "dynamic",
  "dirName": "my-api-keys",
  "lang": "zh",
  "skipped": ["pkgName", "pluginId", "description", "author", "pkgPosition", "target"]
}
```

**Compiled command**:

```sh
dshp create --atoms tool,ui --ui-surfaces settings-card,tool-view --tool-name query_api_keys --config dynamic my-api-keys --lang zh
```

**Verification**: `cd my-api-keys && pnpm install && pnpm typecheck && pnpm build`.

⭐ **With UI surfaces present, starting means `pnpm dsh plugin --profile web add .` followed by
`pnpm dsh web`** — a `--patch` load has no npm package identity, so the browser side never
registers the slot and the surfaces silently don't render.

---

## Case 4 · Custom route · event subscription + HTTP endpoint (no UI)

**User**: "I want to watch session events, and give an external system an HTTP callback endpoint"

**Question style**: C (one batch of blanks)

**Interview transcript**:

> You: What should this plugin do?
> User: Watch session events, and give an external system an HTTP callback endpoint.
> You: A ready-made template, or your own capability combination?
>   Recommended: **your own combination** — the `webhook-bridge` case is oriented the other way
>   ("external events into the session"), while you want "session events → call out to
>   external", so it has to be built by hand.
> User: My own.
> You: [multi-select] Which capability atoms do you want?
>   Recommended `events` (subscribe to host events) + `protocol` (serve an HTTP endpoint).
> User: Those two.
> You: [multi-select] Which event domains to subscribe to?
>   Recommended `session` (session lifecycle) + `tools` (tool calls).
>   Others: `agent`, `approval`, `fs`, `settings`.
> User: session and tools.
> You: Fill these in (anything left blank takes the default, every line is skippable):
>   1. Directory name (default my-plugin): my-listener
>   2. Target track (default latest): next
>   3. Generated project language (default auto-detected): skip
> User: That's all.

**Collected spec**:

```json
{
  "need": "watch session events and give an external system an HTTP callback endpoint",
  "route": "custom",
  "atoms": ["events", "protocol"],
  "eventDomains": ["session", "tools"],
  "dirName": "my-listener",
  "target": "next",
  "skipped": [
    "surfaces",
    "seams",
    "newService",
    "toolName",
    "config",
    "pkgName",
    "pluginId",
    "description",
    "author",
    "pkgPosition",
    "lang"
  ]
}
```

**Compiled command**:

```sh
dshp create --atoms events,protocol --event-domains session,tools my-listener --target next
```

**Verification**: `cd my-listener && pnpm install && pnpm typecheck && pnpm build`.

Note: no `ui` atom was picked, so there are **no UI surfaces and no `client/`** in the output —
that is correct, not a gap.

---

## Case 5 · Custom route · no capability at all (bare skeleton)

**User**: "let me see what a bare skeleton looks like"

**Question style**: A

**Interview transcript**:

> You: What should this plugin do?
> User: Just a bare skeleton for now.
> You: A ready-made template, or your own capability combination?
>   Recommended: **your own combination** (pick no capability atoms) — every template ships
>   capabilities, so only a hand-built combination gives you a bare skeleton.
> User: OK.
> You: [multi-select] Which capability atoms do you want?
>   Picking none is fine (a bare skeleton).
> User: None.
> You: Where should the project go, and what is it called?
> User: my-skeleton, and you decide the rest.

**Collected spec**:

```json
{
  "need": "just a bare skeleton for now",
  "route": "custom",
  "atoms": [],
  "dirName": "my-skeleton",
  "skipped": [
    "domains",
    "surfaces",
    "seams",
    "newService",
    "toolName",
    "config",
    "pkgName",
    "pluginId",
    "description",
    "author",
    "pkgPosition",
    "target",
    "lang"
  ]
}
```

**Compiled command**:

```sh
dshp create --atoms "" my-skeleton
```

**Verification**: `cd my-skeleton && pnpm install && pnpm typecheck && pnpm build`.

⚠️ **Give `--atoms ""` even when no atom was picked** — an empty value is still the
non-interactive path; without it you fall into the CLI's interactive questionnaire (where
nobody is there to answer). That is exactly why the compiler always emits `--atoms` — copying
the compiled result keeps you out of trouble.
