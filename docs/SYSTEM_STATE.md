# System State

**Snapshot date:** 2026-09-25  
**Published release:** v1.1.2  
**Default branch:** `main`

This document describes verified repository/product reality. Published-release behavior, default-branch behavior, and newer behavior in active pull requests are intentionally distinguished.

## Status Legend

- **Shipped:** available in a published GitHub Release.
- **Implemented on main:** merged into the default branch but not necessarily present in the current published installers.
- **In development:** active branch or pull request, not yet part of `main`.
- **Planned:** accepted direction without completed implementation.
- **Historical:** retained for provenance only.

## Shipped Product: v1.1.2

Job Ranger v1.1.2 is a functional Electron desktop job-search companion with:

- local company, job, filter, settings, and scrape-history persistence;
- company/career-source management and scheduled/background monitoring;
- occupation-agnostic Career Profile onboarding;
- hourly or annual compensation preferences;
- deterministic job-fit scoring and plain-language explanations;
- local Applications tracking and notes;
- filters for title, keywords, salary, and location;
- desktop notifications and minimize-to-tray behavior;
- a self-contained Windows x64 installer;
- macOS x64 and arm64 DMG/ZIP artifacts.

The v1.1.2 installers predate the R0/R1 Career Evidence work now on `main`. They do not include SQLite-backed Career Profile/Application migration or resume import/evidence review.

No supported packaged Linux release is currently published.

## Implemented on main after v1.1.2

### R0: durable Career Intelligence + Career Evidence foundation

Issue #60 / PR #66 moved Career Profile and Applications from renderer-local persistence into the backend/SQLite authority boundary and established the Career Evidence domain.

Implemented behavior includes:

- SQLite-backed Career Profile persistence;
- SQLite-backed Applications persistence;
- typed preload/IPC APIs and untrusted-payload validation;
- one-time, idempotent migration from the v1.1 renderer-local keys;
- managed `<userData>/data/artifacts/` storage;
- durable `SourceArtifact`, `ExtractionSnapshot`, `CandidateEvidence`, `EvidenceSourceLink`, `JobRequirement`, `RequirementEvidenceMap`, resume-projection/artifact, and application-artifact contracts;
- the invariant that imported or inferred evidence cannot support factual generated claims until the user confirms it;
- an occupation-diverse synthetic benchmark corpus.

The persistence contract is documented in `docs/design/CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md`.

### Electron generated-runtime boundary

Issue #67 / PR #69 removed the checked-in compiled Electron implementation as an authority source.

Current build contract:

```text
electron/src (authoritative TypeScript)
        ↓
     tsc
        ↓
electron-runtime/ (generated, ignored)
        ↓
dev / tests / Electron Builder / packaged application
```

New Electron modules are expected to be consumed from the generated runtime. Compatibility shims exist only for older test entry points and are not additional implementation copies.

### R1: resume import + Career Evidence review

Issue #61 was completed by parser adoption PR #70 and product implementation PR #71.

Current `main` provides:

- exact `@firecrawl/anydoc@0.2.4` local parser integration for DOCX and text-bearing PDF;
- native plain-text and pasted-text import paths;
- source preservation before interpretation;
- SHA-256 content hashing and duplicate detection;
- parser/version-tagged extraction snapshots;
- explicit OCR-required, encrypted, malformed, unsupported, resource-limit, and parser-failure states;
- no silent hosted OCR or inference;
- deterministic proposed Career Evidence normalization;
- confirm, edit, reject, and merge review;
- provenance links from evidence back to source artifacts/extraction snapshots;
- Career Profile as the user-facing Career Evidence review surface;
- MIT attribution for Anydoc in `THIRD_PARTY_NOTICES.md`.

Only `user-confirmed` and `user-authored` Career Evidence can support factual resume statements. Parser output begins as `imported` evidence and is not truth merely because software extracted it.

The parser adoption evidence includes a 9/9 Linux corpus pass plus bounded Windows x64 and macOS arm64 platform/package checks. Product-level validation proved the native parser in the packaged Electron runtime without external npm/npx requirements.

## In development: R2 requirement ↔ Career Evidence mapping

Issue #62 / PR #73 adds deterministic evidence-backed coverage beneath the existing Career Profile fit heuristic.

The active branch currently implements:

- deterministic normalization of explicit requirements from collected listing text;
- durable `JobRequirement` records classified as must-have, preferred, responsibility, credential, or logistics;
- `direct`, `transferable`, `ambiguous`, and `gap` mappings to Career Evidence;
- direct/transferable support only from user-confirmed or user-authored evidence;
- imported/unconfirmed evidence surfaced as ambiguous rather than accepted support;
- persisted mappings in the existing R0 `job_requirements` and `requirement_evidence_maps` tables;
- on-demand Evidence coverage in Find Jobs;
- a `Prepare resume` handoff from a job into the Career Evidence workflow;
- occupation-diverse deterministic tests and SQLite persistence coverage.

The existing Career Profile fit score remains available. R2 adds an inspectable evidence layer rather than replacing deterministic fallback behavior with an opaque score.

### Current R2 source-text limitation

Job Ranger currently stores `descriptionSnippet` rather than a canonical complete job-description artifact for every source. Requirement extraction can therefore reason only over the listing text actually collected by Job Ranger.

Consequences:

- a missing requirement in Evidence coverage may mean the requirement was absent from the stored snippet, not absent from the employer's full posting;
- Job Ranger must not imply that R2 has exhaustively audited requirements it never ingested;
- future source ingestion should preserve fuller posting text before requirement coverage is described as complete-posting analysis.

The UI therefore presents R2 as evidence coverage over the data Job Ranger currently has, not as a hiring prediction or exhaustive employer assessment.

## Current Architecture

```text
React renderer
    │
    │ typed preload / IPC
    ▼
Electron main process
    ├── JobScoutBackend
    │     ├── companies / jobs / filters / settings / scrape history
    │     └── scraping / scheduling / notifications
    │
    ├── CareerBackend
    │     ├── Career Profile / Applications
    │     ├── source artifacts / extraction snapshots
    │     └── Career Evidence / provenance
    │
    └── RequirementBackend (R2 branch)
          ├── explicit job requirements
          └── requirement ↔ Career Evidence mappings
                    │
                    ▼
                  SQLite
```

The renderer owns presentation and ordinary interaction. It does not receive direct Node.js, arbitrary filesystem, parser, or SQLite authority.

Renderer/runtime safeguards include:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- validated external URLs before `shell.openExternal`;
- renderer Content Security Policy;
- sandboxing on the separate help window;
- main-process file selection for resume import;
- managed source-artifact storage rather than renderer-selected arbitrary file authority.

## Source Handling

### Structured adapters

Explicit API-backed adapters:

- Greenhouse
- Lever
- SmartRecruiters
- Ashby

### Detected / best-effort paths

Recognized generic HTML/browser-backed paths:

- Workday
- iCIMS
- BambooHR
- Taleo
- Oracle Careers
- generic career pages

### Browser-required paths

- Microsoft Careers
- other sources classified as browser-required

Unknown or unsupported sources are allowed to fail honestly rather than being represented as successful.

## Career Evidence and Resume Intelligence Program

Umbrella issue: #59.

- **R0 / #60:** complete on `main`.
- **R1 / #61:** complete on `main`.
- **R2 / #62:** active requirement ↔ Career Evidence mapping slice, PR #73.
- **R3 / #63:** planned deterministic resume creation + artifact lifecycle.
- **R4 / #64:** planned target-specific tailoring + optional inference.
- **R5 / #65:** planned application materials, interview preparation, follow-up, and portability.

Accepted architecture:

```text
Source Artifact
      ↓
Candidate Evidence
      ↓
Job Requirements ↔ Evidence Mapping
      ↓
Resume / Application-Material Projection
      ↓
Truth / Parseability / Relevance Review
      ↓
Versioned Artifact
      ↓
Application Lifecycle
```

No OCR provider, inference provider, agent framework, workflow engine, vector database, or managed-browser platform is required by R0-R2.

## Runtime and Toolchain Baseline

- Node.js `>=22.12.0`
- Electron `44.4.5`
- Vite `8.x`
- TypeScript `7.0.2`
- React `19.2.3`
- Electron Builder `26.x`
- `@electron/notarize` `3.x`
- `@electron/fuses` `2.x`
- `@firecrawl/anydoc` `0.2.4`

Published Windows builds include the pinned official SQLite executable and do not require a separate host SQLite installation. macOS release smoke tests pin `/usr/bin/sqlite3` to avoid hosted-runner PATH ambiguity.

## Quality and Validation

The normal PR/main gate runs:

1. `npm ci`;
2. npm dependency audit;
3. `npm run repo:health`;
4. TypeScript checks;
5. Vite production build;
6. generated Electron desktop compilation;
7. backend/career/resume-import smoke tests;
8. deterministic requirement-mapper and persistence tests while R2 is present.

R1 additionally passed the full Electron Playwright suite and packaged-parser proof. R2 has passed repository health on its active implementation branch and a full serialized Electron Playwright validation of the user-facing evidence-coverage path.

The current dependency audit reports zero known npm vulnerabilities.

## Known Product Gaps

- Users still need to know which employer career pages to add.
- Published v1.1.2 installers do not yet include R0/R1 work from `main`.
- Job ingestion does not yet preserve a canonical full description for every source, limiting R2 requirement completeness.
- Scanned/image-only resume OCR is intentionally not implemented; those imports surface an explicit OCR-required state.
- Generated resume/application artifacts are not implemented yet.
- Target-specific tailoring and optional inference are not implemented.
- Linux distribution is not currently a supported release path.
- Signing/notarization behavior depends on release-environment credentials.
- Source extraction remains inherently variable for dynamic third-party career sites.

## Current Sources of Truth

- `README.md`
- `HELP.md`
- `CHANGELOG.md`
- `docs/CONCEPT.md`
- `docs/SYSTEM_STATE.md`
- `docs/ARCHITECTURE_PLAN.md`
- `docs/planning/PLAN.md`
- `docs/design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md`
- `docs/design/CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md`
- `docs/research/RESUME_INTELLIGENCE_QOR.md`
- `docs/research/RESUME_INTELLIGENCE_CATALOG_HARVEST.md`
- `docs/research/JOB_RANGER_CAPABILITY_CATALOG_RECONCILIATION.md`
- `GOVERNANCE.md`
- `SECURITY.md`
- `THIRD_PARTY_NOTICES.md`

See `docs/README.md` for the documentation hierarchy.
