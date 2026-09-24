# System State

**Snapshot date:** 2026-09-24  
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

Job Ranger v1.1.2 is a functional Electron desktop job-search application with:

- local SQLite-backed company, job, filter, settings, and scrape-history persistence;
- company/career-source management and scheduled/background monitoring;
- occupation-agnostic Career Profile onboarding;
- hourly or annual compensation preferences;
- deterministic job-fit scoring and evidence-oriented explanations;
- local Applications tracking and notes;
- job collection and review;
- filters for title, keywords, salary, and location;
- desktop notifications and minimize-to-tray behavior;
- a self-contained Windows x64 installer;
- macOS x64 and arm64 DMG/ZIP artifacts.

The v1.1.2 installers still represent the pre-R0 persistence boundary: Career Profile and Applications are local but renderer-backed in that published release.

No supported packaged Linux release is currently published.

## In Development: R0 Career Intelligence Foundation

R0 of the Career Evidence and Resume Intelligence program is implemented on PR #66 and tracked by issue #60. It is not yet part of `main` or the published v1.1.2 installers.

PR #66 provides:

- SQLite-backed Career Profile persistence;
- SQLite-backed Applications persistence;
- typed preload/IPC APIs for both domains;
- validated untrusted IPC payloads;
- backend-authoritative application snapshots created from Job Ranger's saved job/company records;
- one-time migration from the v1.1 renderer-local keys;
- deletion of legacy localStorage only after the backend confirms migration success;
- idempotent legacy application migration;
- protection against a legacy profile overwriting an existing durable profile;
- a managed `<userData>/data/artifacts/` directory for future source/generated documents;
- frozen shared Career Evidence domain contracts;
- SQLite schema for the future evidence/provenance/resume-artifact domains;
- deterministic truth helpers that prevent imported/unconfirmed evidence from supporting generated factual claims;
- an occupation-diverse synthetic benchmark corpus with no personal data.

The R0 persistence contract is documented in `docs/design/CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md`.

### Career Evidence schema established by R0

R0 establishes durable contracts/tables for:

- `SourceArtifact`;
- `ExtractionSnapshot`;
- `CandidateEvidence`;
- `EvidenceSourceLink`;
- `JobRequirement`;
- `RequirementEvidenceMap`;
- `ResumeProjection`;
- `ResumeStatement`;
- `ResumeArtifact`;
- `ApplicationArtifactLink`.

These contracts are foundation, not a claim that resume import or generation is already implemented.

### Truth authority

The deterministic R0 invariant is:

- user-confirmed evidence may support factual generated claims;
- user-authored evidence may support factual generated claims;
- imported evidence may not support a factual generated claim until confirmed;
- inferred-pending evidence may not support a factual generated claim until confirmed;
- rejected or missing evidence may not support a factual generated claim.

Future inference cannot weaken this boundary.

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

## Current Architecture

On `main`, the shipped v1.1.x Career Profile and Applications UI remains renderer-backed. PR #66 changes that persistence boundary to the following:

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
    └── CareerBackend
          ├── Career Profile
          ├── Applications
          ├── Career Evidence schema
          └── managed artifact directory
                    │
                    ▼
                  SQLite
```

The renderer owns presentation and ordinary user interaction. It does not receive direct Node.js access or direct SQLite/file authority.

Current renderer safeguards include:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- validated external URLs before `shell.openExternal`;
- renderer Content Security Policy;
- sandboxing on the separate help window.

## Career Evidence and Resume Intelligence Program

Umbrella issue: #59.

- **R0 / #60:** durable Career Intelligence persistence + Career Evidence contract freeze, implemented by PR #66 and awaiting merge.
- **R1 / #61:** resume import + Career Evidence review, next active slice after R0 lands.
- **R2 / #62:** job requirement ↔ Career Evidence mapping.
- **R3 / #63:** deterministic resume creation + artifact lifecycle.
- **R4 / #64:** target-specific tailoring + optional inference.
- **R5 / #65:** application materials, interview preparation, follow-up, and portability.

The accepted architecture remains:

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

`firecrawl/anydoc` remains the preferred R1 parser **candidate**, not a production dependency. It must win the bounded parser benchmark before adoption.

No OCR provider, inference provider, resume renderer, agent framework, workflow engine, vector database, or managed-browser platform has been added by R0.

## Runtime and Toolchain Baseline

- Node.js `>=22.12.0`
- Electron `44.4.5`
- Vite `8.x`
- TypeScript `7.0.2`
- React `19.2.3`
- Electron Builder `26.x`
- `@electron/notarize` `3.x`
- `@electron/fuses` `2.x`

Published Windows builds include the pinned official SQLite executable and do not require a separate host SQLite installation. macOS release smoke tests pin `/usr/bin/sqlite3` to avoid hosted-runner PATH ambiguity.

## Quality and Validation

The standard PR/main gate runs:

1. `npm ci`;
2. npm dependency audit;
3. `npm run repo:health`;
4. TypeScript checks;
5. Vite production build;
6. Electron desktop compilation;
7. backend smoke tests;
8. Career persistence/migration/provenance smoke tests when the R0 branch is present.

PR #66 has passed `npm run repo:health`, including migrations 3/4, normalized Career Profile writes, authoritative application tracking, idempotent legacy migration, restart persistence, Career Evidence table presence, artifact-directory creation, and truth/provenance invariants.

R0 validation also ran the full Electron Playwright E2E suite against the packaged runtime after source/runtime synchronization, and the suite passed 13/13.

The current dependency audit reports zero known npm vulnerabilities.

## Known Build-System Debt

R0 exposed a pre-existing Electron build-layout defect tracked by #67.

Authoritative TypeScript Electron sources live under `electron/src`, while the packaged application and existing runtime tests consume checked-in root `electron/*.cjs` files. PR #66 synchronizes both source and packaged runtime so R0 is valid, but this duplication is not the intended long-term build model.

Issue #67 requires one reproducible compile output to become the runtime consumed by development, tests, Electron Builder, and releases before the backend surface expands substantially through R1-R5.

## Known Product Gaps

- Users still need to know which employer career pages to add.
- Resume import/evidence review is not implemented yet.
- Generated resume/application artifacts are not implemented yet.
- Requirement-to-evidence mapping is not implemented yet.
- Optional inference is not implemented.
- Linux distribution is not currently a supported release path.
- Signing/notarization behavior depends on release-environment credentials.
- Source extraction remains inherently variable for dynamic third-party career sites.
- The product still exposes more technical source/runtime configuration than the long-term consumer UX should require.

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
