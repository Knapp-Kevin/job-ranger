# Changelog

All notable user-facing, architecture, governance, and maintenance changes should be recorded here.

## v1.1.0 - 2026-09-24

### Added

- Career Profile onboarding for target roles, location, pay floor, skills, credentials, and work preferences.
- HVAC starter targets that add common role titles without fabricating certifications, licenses, or experience.
- Deterministic job-fit scoring with plain-language reasons and concerns derived only from saved profile data and collected listing evidence.
- Applications workspace with Interested, Applied, Interview, Offer, Rejected, and Withdrawn states plus local notes.
- Career-Ops lineage and MIT attribution in `THIRD_PARTY_NOTICES.md`.
- Pull-request CI running clean dependency installation, audit reporting, and the repository-health gate.
- Grouped Dependabot policy for routine non-major production and development dependency updates.
- Canonical Job Ranger brand assets for the repository banner, logo lockup, and social preview.
- Repository governance, contribution, security, code-of-conduct, branding, and documentation-index guidance.

### Changed

- Reorganized primary navigation around the job-seeker workflow: Home, Find Jobs, Applications, Career Profile, then source/filter/settings tools.
- Upgraded Electron from the unsupported 28.x line to supported Electron 44.4.5.
- Raised the development and release Node.js baseline to 22.12.0 or newer.
- Upgraded the build stack to Vite 8 and TypeScript 7.
- Upgraded `@electron/notarize`, `@electron/fuses`, and `concurrently` to Node 22-compatible current lines.
- Migrated the macOS notarization hook across the CommonJS/ESM boundary using dynamic import and removed the obsolete notarization `tool` option.
- Updated TypeScript configuration for TypeScript 7 and Vite side-effect module declarations.
- Reworked public documentation around verified shipped, implemented, planned, and historical states.
- Updated Electron Playwright tests for the current accessible UI and Career Intelligence navigation.
- Consolidated branding assets under `docs/assets/branding/` while preserving `public/ICON.png` as the canonical runtime icon.

### Fixed

- Added a bounded SQLite client timeout to prevent transient concurrent access from failing immediately with `database is locked`.
- Corrected SQLite CLI timeout configuration so timeout setup does not contaminate JSON query output.
- Restored accessible modal semantics and filter-form label/control associations discovered by Electron E2E validation.

### Security

- Completed the accumulated non-major dependency-security remediation without `npm audit fix --force`.
- Eliminated the remaining Electron / `extract-zip` high-severity findings by moving to the supported Electron runtime.
- The v1.1.0 release-prep dependency audit reports zero known npm vulnerabilities.
- Removed obsolete duplicate packaging/notarization scripts and temporary write-capable validation workflows after use.

### Persistence note

- Existing companies, jobs, filters, settings, and scrape history remain SQLite-backed.
- Career Profile and Applications are local in v1.1.0 but currently use renderer-local storage. Moving them behind the SQLite/backend boundary remains planned durability work.

## v1.0.2 - 2026-03-20

- Fixed Electron startup on macOS by resolving `sqlite3` with platform-aware lookup instead of a Windows-only command.
- Hardened tray initialization so a missing or invalid tray icon does not prevent the app from launching.
- Added the Electron runtime and source files required for packaged/runtime consistency in the repository.
- Published Windows x64 and macOS x64/arm64 release artifacts.
