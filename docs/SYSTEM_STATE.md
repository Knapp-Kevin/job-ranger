# System State

**Snapshot date:** 2026-09-23  
**Published release:** v1.0.2  
**Default branch:** `main`

This document describes current verified reality. Historical phase documents are retained elsewhere under `docs/` and are not authoritative when they conflict with current source, tests, releases, or this snapshot.

## Status Legend

- **Shipped:** available in a published GitHub Release.
- **Implemented on main:** merged into the default branch, whether or not a new release has been cut.
- **In development:** active branch or pull request, not yet part of `main`.
- **Planned:** accepted direction without completed implementation.
- **Historical:** retained for provenance only.

## Shipped Product

Job Ranger v1.0.2 is a functional Electron desktop application with:

- local SQLite-backed persistence;
- company/career-source management;
- job collection and review;
- filters for title, keywords, salary, and location;
- scrape history and runtime settings;
- desktop notifications;
- minimize-to-tray behavior;
- Windows x64 release artifacts;
- macOS x64 and arm64 release artifacts.

No supported packaged Linux release is currently published.

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

The renderer is a React application. It communicates with the desktop backend through an Electron preload/IPC boundary. The backend owns persistence, scraping, runtime settings, and OS integration.

Current renderer safeguards include:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- validated external URLs before `shell.openExternal`;
- a renderer Content Security Policy;
- sandboxing on the separate help window.

## Quality and Automation

The repository now has pull-request and `main` CI. The CI path:

1. installs dependencies with `npm ci`;
2. runs `npm run repo:health`;
3. therefore typechecks, builds, compiles the desktop source, and runs the backend smoke suite.

Additional unit and Electron Playwright E2E commands exist in the repository, but `repo:health` should not be misrepresented as equivalent to complete cross-platform product validation.

Dependabot is configured and routine non-major updates are grouped. Major upgrades are intentionally handled as migrations rather than merged automatically.

## Active Development

### Career intelligence foundation

PR #28 is active and **not part of `main` or v1.0.2**.

Its current scope includes:

- plain-language Career Profile UI;
- an HVAC starter profile that does not invent credentials;
- deterministic fit scoring and explanations;
- an Applications workspace;
- a consumer-oriented navigation flow;
- Career-Ops lineage/attribution work under the upstream MIT license.

Known follow-ups on that branch include moving profile/application persistence into SQLite, first-run onboarding, consumer-friendly source discovery, resume/evidence handling, optional inference, and scorer tests.

### Toolchain modernization

Issue #38 tracks coordinated modernization of Node, Electron, Vite, and Electron ecosystem tooling.

The current `main` stack still uses Electron 28 and Node `>=20.19.0`. Major Dependabot proposals must not be confused with an accepted supported-runtime target.

## Known Gaps

- Users still need to know which employer career pages to add.
- Career-profile and application-tracking work is not yet shipped.
- The current Electron line needs deliberate modernization.
- Linux distribution is not currently a supported release path.
- Release signing/notarization behavior depends on available platform credentials.
- Source extraction remains inherently variable for dynamic third-party career sites.
- The product still exposes more technical configuration than the long-term consumer UX should require.

## Current Source-of-Truth Documents

- `README.md`
- `HELP.md`
- `docs/CONCEPT.md`
- `docs/SYSTEM_STATE.md`
- `docs/ARCHITECTURE_PLAN.md`
- `docs/planning/PLAN.md`
- `GOVERNANCE.md`
- `SECURITY.md`

See `docs/README.md` for the distinction between current documentation and historical planning artifacts.
