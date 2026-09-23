# Changelog

All notable user-facing, architecture, governance, and maintenance changes should be recorded here.

## Unreleased

### Added

- Pull-request CI running clean dependency installation and the repository-health gate.
- Grouped Dependabot policy for routine non-major production and development dependency updates.
- Canonical Job Ranger brand assets for the repository banner, logo lockup, and social preview.
- Repository governance, contribution, security, code-of-conduct, branding, and documentation-index guidance.

### Changed

- Reworked public documentation around verified shipped, in-development, planned, and historical states.
- Updated the product concept and roadmap to reflect Job Ranger's evolution from a career-page monitor toward a consumer job-search workspace.
- Consolidated branding assets under `docs/assets/branding/` while preserving `public/ICON.png` as the canonical runtime icon.
- Separated current architecture/system-state documentation from superseded phase plans.

### Security

- Dependency maintenance now runs behind a repeatable CI baseline rather than treating an untested Dependabot merge button as evidence of safety.
- Major runtime/toolchain upgrades are being coordinated under issue #38 rather than merged independently.

## v1.0.2 - 2026-03-20

- Fixed Electron startup on macOS by resolving `sqlite3` with platform-aware lookup instead of a Windows-only command.
- Hardened tray initialization so a missing or invalid tray icon does not prevent the app from launching.
- Added the Electron runtime and source files required for packaged/runtime consistency in the repository.
- Published Windows x64 and macOS x64/arm64 release artifacts.
