# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

[中文](https://github.com/carbide4826/dsh-plugin-cli/blob/main/CHANGELOG.md) · English

## [0.1.2] - 2026-09-22

### Added

- Single-source dsh version: template dependency versions are injected at generation time, so a dsh upgrade is a one-line change; the release flow is codified as `pnpm release <version>`.
- Continuous integration: typecheck, tests and generated-project smoke on push/PR, plus a weekly canary probing compatibility with new official versions (GitHub Actions on the repo).

### Fixed

- README cross-language and License links now use absolute URLs; the npm readme preview no longer 404s.

## [0.1.1] - 2026-09-22

### Added

- Localization: bilingual UI via `--lang zh|en` (auto-detects from `LANG` by default); questionnaire, prompts, errors and `--help` all follow the language.
- Generated project READMEs are delivered in a single language matching the generation-time language (`--lang en` yields an English README); repo README / CHANGELOG ship as bilingual pairs.

## [0.1.0] - 2026-09-19

Initial release.
