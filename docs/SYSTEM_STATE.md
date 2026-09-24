# System State

**Snapshot date:** 2026-09-24  
**Published release:** v1.1.1  
**Default branch:** `main`

This document describes current verified reality. Historical phase documents under `docs/` are retained for provenance and are not authoritative when they conflict with current source, tests, releases, or this snapshot.

## Status Legend

- **Shipped:** available in a published GitHub Release.
- **Implemented on main:** merged into the default branch, whether or not a new release has been cut.
- **In development:** active branch or pull request, not yet part of `main`.
- **Planned:** accepted direction without completed implementation.
- **Historical:** retained for provenance only.

## Shipped Product

Job Ranger v1.1.1 is a functional Electron desktop job-search application with:

- local SQLite-backed company, job, filter, settings, and scrape-history persistence;
- company/career-source management and scheduled/background monitoring;
- Career Profile onboarding;
- deterministic job-fit scoring and evidence-oriented explanations;
- local Applications tracking and notes;
- job collection and review;
- filters for title, keywords, salary, and location;
- desktop notifications;
- minimize-to-tray behavior;
- a self-contained Windows x64 installer;
- macOS x64 and arm64 DMG/ZIP artifacts.

v1.1.0 published the macOS v1.1 artifacts, but its Windows builder exposed that packaged Windows execution still depended on a host `sqlite3.exe`. v1.1.1 corrects that boundary and supersedes v1.1.0 for normal installation.

No supported packaged Linux release is currently published.

### Career Intelligence persistence boundary

Career Profile and Applications are local-first in the v1.1 line, but currently use renderer-local storage. They have not yet moved behind the desktop backend/SQLite repository boundary. That migration remains planned durability work and should not be obscured by the fact that the UI is already functional.

## Source Handling

### Structured adapters

These source types have explicit API-backed adapters:

- Greenhouse
- Lever
- SmartRecruiters
- Ashby

### Detected / best-effort paths

These are recognized and can use generic HTML and/or browser-backed extraction, but are not represented as equally reliable:

- Workday
- iCIMS
- BambooHR
- Taleo
- Oracle Careers
- generic career pages

### Browser-required paths

- Microsoft Careers
- other sources classified as browser-required

### Manual review

Unknown or unsupported sources are allowed to fail honestly rather than being reported as successful.

## Architecture State

The renderer is a React application. It communicates with the desktop backend through an Electron preload/IPC boundary. The backend owns SQLite persistence, scraping, runtime settings, and OS integration.

The v1.1 user-facing renderer includes:

- Home;
- Find Jobs;
- Applications;
- Career Profile;
- Companies;
- Filters;
- Settings.

Current renderer safeguards include:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- validated external URLs before `shell.openExternal`;
- a renderer Content Security Policy;
- sandboxing on the separate help window.

## Runtime and Toolchain Baseline

The coordinated modernization tracked under issue #38 is complete:

- Node.js `>=22.12.0`;
- Electron `44.4.5`;
- Vite `8.x`;
- TypeScript `7.0.2`;
- `@vitejs/plugin-react` `6.1.1`;
- `@electron/notarize` `3.1.1`;
- `@electron/fuses` `2.1.3`;
- `concurrently` `10.x`.

The macOS Electron Builder hook remains CommonJS because Electron Builder loads it that way, and dynamically imports the ESM-only notarization package. Notarization is skipped when Apple credentials are unavailable rather than failing ordinary non-notarized validation.

The stale root-level Electron `version` artifact from the old 28.3.3 runtime has been removed. `package.json` is the application-version source used by Electron Builder.

## Windows Runtime Packaging

Published Windows builds no longer require a separate SQLite installation.

The release workflow:

1. downloads the pinned official SQLite 3.53.4 x64 tools archive from `sqlite.org`;
2. verifies its published SHA3-256 digest;
3. stages only `sqlite3.exe` for Electron Builder;
4. uses that executable for release-build repository-health checks;
5. packages it in the installed app's `resources` directory;
6. verifies the packaged executable runs and is selected by the runtime resolver with `SQLITE3_PATH` removed.

Windows Actions run `36017084154` proved the package boundary before release, and the v1.1.1 Windows release builder subsequently passed and uploaded the installer.

## macOS Release Packaging

The v1.1.1 macOS artifacts were built from the immutable v1.1.1 tag and uploaded for both x64 and arm64.

During the first v1.1.1 macOS release attempt, GitHub's hosted runner exposed an Android SDK `sqlite3` earlier on `PATH` than the system SQLite. The recovery build explicitly used `/usr/bin/sqlite3` for release smoke tests while still checking out the v1.1.1 tag. The durable release workflow now pins macOS release smoke tests to `/usr/bin/sqlite3` so future packaging is deterministic on hosted runners.

## Quality and Automation

The repository has pull-request and `main` CI. The standard CI path:

1. installs dependencies with `npm ci`;
2. reports the npm dependency audit;
3. runs `npm run repo:health`;
4. therefore typechecks, builds, compiles the desktop source, and runs the backend smoke suite.

Runtime/release validation also uses the Electron Playwright E2E suite. The current suite passes 11/11 on the modernized Electron 44 runtime.

The v1.1.1 dependency audit reports zero known npm vulnerabilities.

Dependabot remains configured with grouped routine non-major updates. Major runtime/toolchain changes are treated as coordinated migrations rather than blindly merged bot proposals.

## Career Intelligence Foundation

The former PR #28 is merged and forms the first native Career Intelligence slice.

Implemented behavior includes:

- plain-language Career Profile UI;
- HVAC starter target roles without fabricated credentials;
- deterministic fit scoring and explanations;
- Applications workspace;
- consumer-oriented navigation;
- Career-Ops lineage/attribution under the upstream MIT license.

Known follow-ups include:

- moving Career Profile persistence into SQLite/backend;
- moving Applications persistence into SQLite/backend;
- stronger deterministic scorer test coverage;
- first-run onboarding routing;
- consumer-friendly source discovery;
- resume/evidence handling;
- optional provider-agnostic inference.

## Known Gaps

- Users still need to know which employer career pages to add.
- Career Profile and Applications are local but not yet SQLite-backed.
- Linux distribution is not currently a supported release path.
- Signing/notarization behavior depends on release-environment credentials.
- Source extraction remains inherently variable for dynamic third-party career sites.
- The product still exposes more technical source/runtime configuration than the long-term consumer UX should require.
- Resume import and factual evidence provenance are not implemented yet.

## Current Sources of Truth

- `README.md`
- `HELP.md`
- `CHANGELOG.md`
- `docs/CONCEPT.md`
- `docs/SYSTEM_STATE.md`
- `docs/ARCHITECTURE_PLAN.md`
- `docs/planning/PLAN.md`
- `docs/windows-package-validation.md`
- `GOVERNANCE.md`
- `SECURITY.md`
- `THIRD_PARTY_NOTICES.md`

See `docs/README.md` for the distinction between current documentation, validation evidence, and historical planning artifacts.
