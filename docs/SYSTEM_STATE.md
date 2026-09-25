# System State

**Snapshot date:** 2026-09-25  
**Published release:** v1.1.2  
**Default branch:** `main`

This document describes verified repository/product reality. Published-release behavior and newer default-branch behavior are intentionally distinguished.

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

The v1.1.2 installers predate the Career Evidence R0-R3 implementation now developed on `main`. In particular, v1.1.2 does not include SQLite-backed Career Profile/Application migration, resume import/review, evidence-backed job requirement coverage, or the deterministic Resume workspace.

No supported packaged Linux release is currently published.

## Implemented on main after v1.1.2

### R0: durable Career Intelligence and Career Evidence foundation

Issue #60 / PR #66 moved Career Profile and Applications behind the trusted Electron/SQLite boundary and established the durable Career Evidence domain.

Implemented behavior includes:

- SQLite-backed Career Profile and Applications;
- typed preload/IPC APIs and untrusted-payload validation;
- one-time idempotent migration from the v1.1 renderer-local keys;
- managed `<userData>/data/artifacts/` storage;
- durable `SourceArtifact`, `ExtractionSnapshot`, `CandidateEvidence`, `EvidenceSourceLink`, `JobRequirement`, `RequirementEvidenceMap`, resume-projection/artifact, and application-artifact contracts;
- factual authority restricted to user-confirmed or user-authored Career Evidence;
- an occupation-diverse synthetic benchmark corpus.

The persistence contract is documented in `docs/design/CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md`.

### Generated Electron runtime boundary

Issue #67 / PR #69 removed checked-in compiled Electron implementation files as an authority source.

```text
electron/src (authoritative TypeScript)
        ↓
       tsc
        ↓
electron-runtime/ (generated, ignored)
        ↓
dev / tests / Electron Builder / packaged application
```

Compatibility shims exist only for older test entry points. New privileged modules are consumed from the generated runtime rather than maintained twice.

### R1: resume import and Career Evidence review

Issue #61 was completed by parser-adoption PR #70 and product PR #71.

Current behavior includes:

- exact `@firecrawl/anydoc@0.2.4` local parser integration for DOCX and text-bearing PDF;
- native plain-text and pasted-text import;
- source preservation before interpretation;
- SHA-256 content hashing and duplicate detection;
- parser/version-tagged extraction snapshots;
- explicit OCR-required, encrypted, malformed, unsupported, resource-limit, and parser-failure states;
- no silent hosted OCR or inference;
- deterministic proposed Career Evidence normalization;
- confirm, edit, reject, and merge review;
- provenance links back to source artifacts/extraction snapshots;
- Career Profile as the user-facing evidence review surface;
- MIT attribution for Anydoc.

Parser output begins as `imported` evidence and does not become factual authority merely because extraction succeeded.

### R2: job requirement to Career Evidence mapping

Issue #62 / PR #73 added deterministic evidence-backed coverage beneath the Career Profile fit heuristic.

Implemented behavior includes:

- normalization of explicit requirements from listing text Job Ranger actually collected;
- durable `JobRequirement` records classified as must-have, preferred, responsibility, credential, or logistics;
- `direct`, `transferable`, `ambiguous`, and `gap` mappings;
- direct/transferable support only from confirmed/user-authored evidence;
- imported/unconfirmed evidence remaining ambiguous;
- persisted requirement/evidence mappings;
- on-demand Evidence coverage in Find Jobs;
- explicit visible gaps rather than optimistic fabricated claims;
- a Prepare resume handoff from a job;
- deterministic operation with no inference provider.

The existing Career Profile fit score remains available as a deterministic fallback.

#### R2 source-text limitation

Job Ranger does not yet preserve a canonical complete job-description artifact for every source. Requirement coverage therefore reasons only over listing text that Job Ranger actually collected. A missing requirement may reflect incomplete source ingestion rather than absence from the employer's full posting.

The UI must continue to present this as evidence coverage, not an exhaustive employer audit or hiring prediction.

### R3: deterministic resume creation and artifact lifecycle

Issue #63 / PR #75 adds the first complete resume-creation workflow without requiring inference.

Implemented behavior includes:

- a top-level Resume workspace;
- job-targeted Prepare resume navigation from Find Jobs;
- immutable structured `ResumeProjection` state and evidence-linked `ResumeStatement` records;
- deterministic selection from confirmed Career Evidence, with R2 direct/transferable evidence prioritized for targeted jobs;
- two Job Ranger-owned templates: `ats-standard-v1` and `ats-compact-v1`;
- isolated Chromium PDF rendering with sandboxing, JavaScript disabled, Node integration disabled, navigation blocked, and a document CSP that denies remote resources;
- a blocking Truth Gate for missing, unconfirmed, or unsupported factual edits;
- generated-PDF reparse through the existing Anydoc boundary;
- a critical/advisory Parseability Gate;
- versioned PDF artifacts with SHA-256 hashes, page count, gate reports, and an immutable projection snapshot;
- resume version comparison from stored snapshots rather than filenames;
- exact Application-to-resume-artifact linkage for targeted exports;
- artifact reveal through the constrained desktop API;
- atomic multi-record resume persistence through a single-process SQLite transaction primitive.

R3 remains deterministic. It does not require or invoke a remote inference provider to create or export a truthful resume.

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
    ├── RequirementBackend
    │     ├── explicit job requirements
    │     └── requirement ↔ Career Evidence mappings
    │
    └── ResumeService
          ├── deterministic projections / statements
          ├── Truth Gate
          ├── isolated Chromium PDF render
          ├── Anydoc PDF reparse / Parseability Gate
          └── versioned artifacts / Application links
                    │
                    ▼
                  SQLite
                    │
                    └── managed filesystem artifacts
```

The renderer owns presentation and ordinary interaction. It does not receive direct Node.js, arbitrary filesystem, parser, Chromium-renderer, or SQLite authority.

## Security and Trust Boundaries

The desktop shell retains:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- a typed preload boundary;
- external URL validation before `shell.openExternal`;
- renderer Content Security Policy;
- main-process file selection for resume import;
- managed source/artifact storage rather than renderer-selected arbitrary write authority.

Resume import treats uploaded documents as untrusted input. Ordinary extraction stays local. Scanned/image-only documents surface an OCR-required state rather than silently leaving the machine.

Resume PDF rendering uses a separate hidden Chromium window with:

- sandbox enabled;
- Node integration disabled;
- context isolation enabled;
- JavaScript disabled;
- window opening denied;
- navigation denied;
- an embedded CSP using `default-src 'none'` and inline styles only.

User-provided resume text and contact data are HTML-escaped before rendering.

## Source Handling

### Structured adapters

- Greenhouse
- Lever
- SmartRecruiters
- Ashby

### Detected / best-effort paths

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
- **R2 / #62:** complete on `main`.
- **R3 / #63:** deterministic resume creation and artifact lifecycle implemented by PR #75.
- **R4 / #64:** planned target-specific tailoring and optional inference.
- **R5 / #65:** planned application materials, interview preparation, follow-up, and portability.

Accepted authority chain:

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

R0-R3 require no OCR provider, inference provider, agent framework, workflow engine, vector database, or managed-browser platform.

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
3. TypeScript checks;
4. Vite production build;
5. generated Electron desktop compilation;
6. backend smoke tests;
7. Career persistence tests;
8. resume-import tests;
9. requirement-mapper and requirement-persistence tests;
10. deterministic resume lifecycle tests.

Additional product-level Electron Playwright validation is used for substantial desktop workflow changes. R1 and R2 each passed their user-facing Electron paths before merge. R3 adds a product-level test that proves confirmed Career Evidence can create and export a verified PDF through the actual desktop boundary.

The current dependency audit reports zero known npm vulnerabilities.

## Known Product Gaps

- The published v1.1.2 installers do not yet include R0-R3 work from `main`.
- Users still need to know which employer career pages to add.
- Job ingestion does not preserve canonical full descriptions for every source, limiting R2 requirement completeness.
- Scanned/image-only resume OCR is intentionally not implemented.
- R3 resume creation is deterministic; target-specific rewriting and optional inference are R4 work.
- Cover letters, richer interview preparation, follow-up/reminders, contacts/milestones, and full export/backup are R5 work.
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
