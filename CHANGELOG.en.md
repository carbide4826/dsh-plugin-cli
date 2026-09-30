# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

[中文](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.md) · English

## [0.1.7] - 2026-09-30

### Changed

- Track promotion: the latest track now pairs dsh `0.1.7-rc.2` (the former next tree) and the next track pairs dsh `0.2.0-rc.2`; the settings card uses the plugin-tab slot on both tracks, and cordis / schemastery pairing is identical on both (`~4.0.4` / `~3.18.4`).

### Fixed

- Fixed a typecheck error (TS2322) in projects generated from the `ui` preset: the example config's volatile field clashed with a leftover `z<Config>` type annotation, which is now removed.

## [0.1.6] - 2026-09-29

### Internal

- Releases now publish via GitHub Actions trusted publishing — push a `v*` tag and CI builds and publishes (OIDC, no token); added the repository field to package.json.

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
