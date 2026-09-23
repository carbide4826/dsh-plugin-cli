# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

[中文](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.md) · English

## [0.1.3] - 2026-09-24

### Fixed

- Fix a type issue in the quick-tool template; generated projects now pass typecheck.

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
