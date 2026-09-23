# Job Ranger Roadmap

**Current as of:** 2026-09-23

This file is the active roadmap. Older phase/remediation plans under `docs/` are historical implementation records and no longer define current status.

## North Star

Job Ranger should become a desktop job-search companion that an ordinary person can install and use without learning software-development tooling.

The product should help the user:

1. find opportunities;
2. understand which ones are worth attention;
3. prepare a factual application;
4. track what happened;
5. identify useful next steps.

Core functionality should remain useful without inference. Optional inference should improve guidance, not determine whether the app is usable.

## Shipped Foundation

### Desktop and persistence

- [x] Electron desktop application
- [x] React renderer
- [x] local SQLite persistence
- [x] typed preload/IPC boundary
- [x] runtime settings
- [x] local data-folder access

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

### Job-search workflow

- [x] jobs review view
- [x] title/keyword/location filters
- [x] salary parsing/filter support
- [x] desktop notifications
- [x] optional minimize-to-tray behavior

### Packaging and quality

- [x] Windows v1.0.2 release
- [x] macOS x64 v1.0.2 release
- [x] macOS arm64 v1.0.2 release
- [x] typecheck/build/backend smoke baseline
- [x] focused unit tests
- [x] Electron Playwright E2E suite
- [x] PR CI
- [x] grouped Dependabot policy for routine non-major updates

## Active Work

### Career intelligence foundation — PR #28

Status: **in development, not merged**

Current PR scope:

- [x] plain-language Career Profile UI
- [x] HVAC starter targets without fabricated credentials
- [x] deterministic fit scoring
- [x] plain-language fit/review explanations
- [x] Applications workspace and statuses
- [x] consumer-oriented navigation
- [x] MIT attribution boundary for Career-Ops-derived work

Required follow-up before this becomes the durable foundation:

- [ ] move Career Profile persistence into SQLite/backend
- [ ] move Applications persistence into SQLite/backend
- [ ] add deterministic fit-scorer tests
- [ ] add first-run onboarding routing
- [ ] verify UI behavior with nontechnical-user flows

### Toolchain modernization — issue #38

Status: **planned/coordinated migration**

- [ ] choose a supported Electron target line
- [ ] establish the required Node baseline
- [ ] reconcile ESM/CJS boundaries
- [ ] migrate Vite/plugin stack deliberately
- [ ] migrate Electron ecosystem tooling
- [ ] pass clean `npm ci`
- [ ] pass `repo:health`
- [ ] pass Electron E2E
- [ ] validate Windows packaging
- [ ] validate macOS packaging/notarization behavior where credentials permit

## Next Product Slices

### 1. First-run experience

Goal: a new user should launch Job Ranger and immediately understand what information is needed.

- [ ] role/occupation input
- [ ] location and commute radius
- [ ] pay floor/preferences
- [ ] resume upload or guided experience entry
- [ ] certification/license capture
- [ ] suggested adjacent role titles
- [ ] no requirement for GitHub, YAML, terminal commands, or provider configuration

### 2. Consumer-friendly source discovery

Goal: users should not need to know employer ATS URLs in advance.

- [ ] search by role + geography
- [ ] resolve relevant employer/source pages internally
- [ ] keep source discovery separate from extraction adapters
- [ ] preserve trust/support labels for resolved sources
- [ ] avoid creating a brittle one-off employer catalog as the architecture

### 3. Resume and evidence model

Goal: Job Ranger can prepare tailored application material without inventing experience.

- [ ] resume import
- [ ] normalized candidate evidence model
- [ ] provenance for skills/credentials/accomplishments
- [ ] tailored resume generation from supported evidence only
- [ ] visible warnings when a requested claim lacks evidence

### 4. Optional inference layer

Goal: richer reasoning without making AI mandatory.

Potential capabilities:

- [ ] fuzzy requirement-to-experience matching
- [ ] fit explanations
- [ ] resume phrasing assistance
- [ ] interview preparation
- [ ] transferable-skill analysis
- [ ] repeated skill/credential gap analysis

Architecture requirements:

- [ ] provider boundary rather than provider-specific UI
- [ ] explicit user disclosure before remote inference receives personal career data
- [ ] deterministic fallback when inference is absent
- [ ] no silent transmission of resumes or profile data

### 5. Application workflow maturity

- [ ] reminders/follow-up dates
- [ ] contacts and notes
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

- [ ] complete issue #38 modernization
- [ ] maintain Windows release confidence
- [ ] maintain macOS x64/arm64 release confidence
- [ ] validate signing/notarization process
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
