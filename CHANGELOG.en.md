# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

[中文](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.md) · English

## [Unreleased]

### Changed

- Both tracks now follow upstream dsh `0.2.1-rc.2`: the official npm latest / next tags have both been folded into that version (registry sequence delta 7), and the latest track catches up, so both tracks pin `0.2.1-rc.2`; the paired versions move with the official meta-package declarations (cordis `~4.0.5` / schemastery `~3.18.5`). Zero template changes — the material uses version placeholders throughout, all 31 referenced dsh sub-packages exist in the new version, and the slot keys / event names / tool-call block shape all check out.

### Added

- Agent skill: the repository now ships `skills/dshp/` with the npm package. It teaches an agent how to scaffold a dsh plugin project with dshp — picking an entry point (preset / curated case / where the free-combination boundary lies), choosing a track, the three verification steps, host integration — and records the pitfalls that are expensive to rediscover (approve-builds, the cordis double instance, typecheck going green on missing types, UI surfaces only rendering after `build` + `plugin add`).

## [0.1.9] - 2026-10-08

### Added

- Surface dependency guard: picking a UI surface now validates the atoms it needs — choosing `tool-view` without `tool` reports and re-asks in the questionnaire instead of generating a surface registered under an empty key.
- Placeholder drift guard: a template token the variable table cannot resolve fails generation immediately and lists "file · key", so leftover braces no longer land in generated projects.

### Changed

- Curated case manifests gained the `files` allow-list (`dist` / `icon.svg` / `locale` / `cordis.patch.yml`), matching what the preset pipeline emits; without it npm fell back to the `.gitignore` blacklist and a published plugin risked shipping no `dist`.
- The interactive "target track" step uses `--target` as its initial value: passing `--target next` and pressing Enter locks the next track instead of silently falling back to latest.
- The interactive "directory already exists" outcome now exits with code 1, matching the non-interactive path; a deliberate user abort still exits 0.
- The quick-tool case reads its result-card title from the host's tool-name prop, collapsing the tool name to a single definition in `src/tool.ts`.
- The protocol atom's port comment now speaks to the plugin author (declare a `Config` field and read the port from it if you want it configurable).

### Fixed

- Canary probe: fixed the syntax error in the inline Node snippet (the step failed every run) and made the job exit when the manifest version or npm `dist-tags.latest` resolves empty, so an empty string can no longer reach the later substitution.
- The dependency audit covers `@deepseek-ai/dsh-client-ui-settings` (the package that hands over the slot types), so the known host package set matches what templates actually reference.

### Internal

- The publish workflow drops the unused `id-token` permission (release authentication runs on the `NPM_TOKEN` repository secret; provenance is not enabled).

## [0.1.8] - 2026-10-07

### Changed

- The latest track catches up to dsh `0.2.0-rc.2`, sharing the version with the next track; template dependencies and scenario materials now pin that pairing uniformly.
- The plugin entry for dynamic configuration is still generated per track (latest / next arms); both arms currently emit the same content.

### Fixed

- The dynamic-configuration entry no longer emits the host's removed `ctx.settings.installSection` wiring, and no longer declares the `settings` readiness requirement or the `@deepseek-ai/dsh-settings` peer.
- The `settings` event domain drops `@deepseek-ai/dsh-settings-file` from its peer list (the package was removed upstream; generated projects failed dependency installation with a 404).
- The `settings` event-domain atom now listens on `settings/document-updated`, the event the host declares (`settings/updated` is undeclared, so generated projects failed typecheck).
- The event-domain catalogue lists only events the host declares: `agent/session-start` is replaced by `agent/created` plus `agent/disposed`, and `settings/updated` is dropped.

## [0.1.7] - 2026-09-30

### Changed

- Track promotion: the latest track now pairs dsh `0.1.7-rc.2` (the former next tree) and the next track pairs dsh `0.2.0-rc.2`; the settings card uses the plugin-tab slot on both tracks, and cordis / schemastery pairing is identical on both (`~4.0.4` / `~3.18.4`).

### Fixed

- Fixed a typecheck error (TS2322) in projects generated from the `ui` preset: the example config's volatile field clashed with a leftover `z<Config>` type annotation, which is now removed.

## [0.1.6] - 2026-09-29

### Internal

- Releases now publish from GitHub Actions — push a `v*` tag and CI builds and publishes (authenticated with the `NPM_TOKEN` repository secret); added the repository field to package.json.

## [0.1.5] - 2026-09-29

### Added

- Dual-track template architecture: built-in latest (paired with dsh 0.1.5-rc.3) and next (paired with dsh 0.1.7-rc.2) template trees; `dshp create --target next` scaffolds a plugin for the next host generation. Interactive scaffolding asks for the track (default: latest).
- next track adapts to dsh 0.1.7: the settings-page plugin entry migrates from a keyed card to a Plugins tab (`settings.plugins.tab`); plugin configuration moves to the host's native config forms (0.1.7 removed `installSection`) — fields marked volatile become editable and hot-reload on save; on the Plugins page (sidebar "Plugins") each plugin's component row gains a "Configure" entry with an in-page editing form (shipped with the model-gateway case, styled after the host's native forms).
- Plugins-inventory detail info: templates ship a dedicated icon (`icon.svg`) and bilingual metadata (`locale/{zh,en}.json` title and description); the host renders them by UI locale with English fallback. Presets and every curated case carry them by default.
- Message source kinds: 0.1.7 removed the shared `plugin` kind; templates now declare their own `plugin-notice` kind (protocol atom / session-bot / webhook-bridge).

### Changed

- cordis and schemastery dependencies are now pinned exactly to the official meta-package pairing; floating ranges spawn a second instance in the install tree, breaking declaration merging and failing project typecheck.
- latest track follows dsh 0.1.5-rc.3; the loader/hmr/timer pinning introduced in 0.1.3 is removed (the rc.3 meta-package pins them itself — the workaround expired).

## [0.1.4] - 2026-09-24

### Internal

- README roadmap known-issue entry updated to "mitigated", aligning with the actual fix in 0.1.3.

## [0.1.3] - 2026-09-24

### Fixed

- Fix a type issue in the quick-tool template; generated projects now pass typecheck.
- Fix `pnpm dsh web` crashing right after a pnpm install: cordis-plugin-loader 1.0.5 (published 2026-09-22 by official) is incompatible with dsh 0.1.5-rc.2 (silent HMR service load failure). Generated projects now ship a `pnpm-workspace.yaml` pinning the paired loader/hmr/timer versions as mitigation. Next step: skip rc.3 and upgrade the whole tree once the official 0.1.7 line stabilizes.

## [0.1.2] - 2026-09-22

### Fixed

- README cross-language and License links broken on the npm readme preview.

### Internal

- Engineering improvements (CI, release flow, unified template versioning); no behavior change.

## [0.1.1] - 2026-09-22

### Added

- Localization: bilingual UI via `--lang zh|en` (auto-detects from `LANG` by default); questionnaire, prompts, errors and `--help` all follow the language.
- Generated project READMEs are delivered in a single language matching the generation-time language (`--lang en` yields an English README); repo README / CHANGELOG ship as bilingual pairs.

## [0.1.0] - 2026-09-19

Initial release.
