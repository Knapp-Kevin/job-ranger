# Job Ranger Roadmap

**Current as of:** 2026-09-24

This file is the active roadmap. Older phase/remediation plans under `docs/` are historical implementation records and no longer define current status.

## North Star

Job Ranger should be a desktop job-search companion that an ordinary person can install and use without learning software-development tooling.

The product should help the user:

1. find opportunities;
2. understand which ones are worth attention;
3. prepare a factual application;
4. track what happened;
5. identify useful next steps.

Core functionality remains useful without inference. Optional inference should improve guidance, not determine whether the app is usable.

## Shipped Foundation

### Desktop and persistence

- [x] Electron desktop application
- [x] React renderer
- [x] local SQLite persistence for source/job/filter/settings/scrape domains
- [x] typed preload/IPC boundary
- [x] runtime settings
- [x] local data-folder access
- [x] local Career Profile storage
- [x] local Applications storage

Career Profile and Applications are functional but still renderer-local. Moving them to the desktop backend/SQLite repository is the next persistence-hardening step.

### Job-source monitoring

- [x] company/career-source management
- [x] Greenhouse adapter
- [x] Lever adapter
- [x] SmartRecruiters adapter
- [x] Ashby adapter
- [x] generic HTML/browser-backed fallback paths
- [x] explicit source-support classification
- [x] scrape history
- [x] cooldown/circuit-breaker behavior

### Career intelligence foundation

- [x] plain-language Career Profile UI
- [x] HVAC starter targets without fabricated credentials
- [x] deterministic fit scoring
- [x] plain-language fit/review explanations
- [x] Applications workspace and statuses
- [x] consumer-oriented navigation
- [x] MIT attribution boundary for Career-Ops-derived work

### Job-search workflow

- [x] Find Jobs review view
- [x] deterministic profile-to-listing fit guidance
- [x] title/keyword/location filters
- [x] salary parsing/filter support
- [x] application status tracking and notes
- [x] desktop notifications
- [x] optional minimize-to-tray behavior

### Packaging, runtime, and quality

- [x] Windows v1.1.0 release
- [x] macOS x64 v1.1.0 release
- [x] macOS arm64 v1.1.0 release
- [x] Node.js 22.12+ baseline
- [x] supported Electron 44.4.5 runtime
- [x] Vite 8 / TypeScript 7 toolchain
- [x] modern Electron notarization/fuse tooling
- [x] clean dependency audit baseline
- [x] typecheck/build/backend smoke baseline
- [x] focused unit tests
- [x] Electron Playwright E2E suite
- [x] PR CI
- [x] grouped Dependabot policy for routine non-major updates

## Completed Modernization

The coordinated runtime/toolchain migration formerly tracked under issue #38 is complete in the v1.1.0 line:

- [x] supported Electron target selected and adopted
- [x] Node baseline raised deliberately
- [x] ESM/CJS notarization boundary reconciled
- [x] Vite/plugin stack migrated together
- [x] Electron ecosystem tooling modernized
- [x] TypeScript 7 adopted
- [x] clean `npm ci`
- [x] `repo:health`
- [x] Electron E2E
- [x] Windows packaging validation
- [x] macOS x64/arm64 packaging validation

Future major toolchain upgrades should follow the same migration discipline rather than arrive as disconnected bot merges.

## Next Product Slices

### 1. Durable Career Intelligence persistence

Goal: Career Profile and Applications should survive through the same governed backend boundary as the rest of Job Ranger's durable state.

- [ ] move Career Profile persistence into SQLite/backend
- [ ] move Applications persistence into SQLite/backend
- [ ] define migrations for both domains
- [ ] preserve existing local renderer data during migration where practical
- [ ] add deterministic scorer tests and persistence tests

### 2. First-run experience

Goal: a new user should launch Job Ranger and immediately understand what information is needed.

- [ ] route first launch into Career Profile when no profile exists
- [ ] simplify role/occupation entry
- [ ] clarify location and commute radius behavior
- [ ] clarify pay floor/preferences
- [ ] add resume upload or guided experience entry
- [ ] improve certification/license capture
- [ ] suggest adjacent role titles without fabricating qualification
- [ ] no requirement for GitHub, YAML, terminal commands, or provider configuration

### 3. Consumer-friendly source discovery

Goal: users should not need to know employer ATS URLs in advance.

- [ ] search by role + geography
- [ ] resolve relevant employer/source pages internally
- [ ] keep source discovery separate from extraction adapters
- [ ] preserve trust/support labels for resolved sources
- [ ] avoid creating a brittle one-off employer catalog as the architecture

### 4. Resume and evidence model

Goal: Job Ranger can prepare tailored application material without inventing experience.

- [ ] resume import
- [ ] normalized candidate evidence model
- [ ] provenance for skills/credentials/accomplishments
- [ ] tailored resume generation from supported evidence only
- [ ] visible warnings when a requested claim lacks evidence

### 5. Optional inference layer

Goal: richer reasoning without making AI mandatory.

Potential capabilities:

- [ ] fuzzy requirement-to-experience matching
- [ ] richer fit explanations
- [ ] resume phrasing assistance
- [ ] interview preparation
- [ ] transferable-skill analysis
- [ ] repeated skill/credential gap analysis

Architecture requirements:

- [ ] provider boundary rather than provider-specific UI
- [ ] explicit user disclosure before remote inference receives personal career data
- [ ] deterministic fallback when inference is absent
- [ ] no silent transmission of resumes or profile data

### 6. Application workflow maturity

- [ ] reminders/follow-up dates
- [ ] contacts
- [ ] interview milestones
- [ ] offer details
- [ ] export/backup
- [ ] useful dashboard summaries without gamifying unemployment into a productivity contest

## Source Reliability Track

Continue improving source support based on evidence from real sites:

- [ ] Workday reliability
- [ ] iCIMS reliability
- [ ] BambooHR reliability
- [ ] Oracle/Taleo reliability
- [ ] pagination/infinite-load handling where appropriate
- [ ] clearer user-facing failure diagnostics

Do not promote a source from best-effort to supported merely because one example happened to work.

## Packaging Track

- [x] complete Node/Electron/Vite/TypeScript modernization
- [ ] maintain Windows release confidence on future releases
- [ ] maintain macOS x64/arm64 release confidence on future releases
- [ ] validate notarization with production Apple credentials whenever those credentials are available
- [ ] decide whether Linux becomes an explicitly supported release target

## Deferred / Not Current Goals

- cloud account requirement
- multi-user/team job-search workspace
- recruiter-facing ATS functionality
- autonomous mass auto-apply
- opaque AI ranking that cannot explain its evidence

These can be reconsidered only through an explicit product/governance decision, not by feature creep.

## Historical Plans

Earlier phase plans remain under `docs/` for provenance. See [`../README.md`](../README.md) for the documentation index and status hierarchy.
