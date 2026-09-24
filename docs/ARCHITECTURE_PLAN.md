# Architecture and Evolution Plan

This document describes Job Ranger's current architecture and intended direction. Older phase plans are retained as historical records and should not be read as current implementation status.

## Product Architecture Principle

Job Ranger is a focused job-search companion, not an agent platform.

The durable architectural rule is:

> **Job Ranger owns career truth, job-search state, and the user's application lifecycle. External capabilities are narrow replaceable adapters, never authorities.**

That means:

- a parser may extract facts but does not establish truth;
- an inference provider may propose language or mappings but does not establish truth;
- a search provider may discover candidate sources but does not silently add trusted sources;
- a browser may retrieve pages but does not silently submit consequential actions;
- a renderer formats a resume but does not become canonical storage;
- a calendar or notification provider may mirror reminders but does not own the application lifecycle.

The maintained Technical Capability Catalog is used to identify implementation donors, benchmarks, and optional capability seams. A catalog entry is not an adoption instruction.

## Current Architecture

The published v1.1.2 installers still contain the pre-R0 Career Profile/Application persistence boundary. PR #66 changes the durable desktop architecture to:

```text
┌─────────────────────────────────────┐
│ React renderer                      │
│ Home / Find Jobs / Applications     │
│ Career Profile / Companies          │
│ Filters / Settings                  │
└──────────────────┬──────────────────┘
                   │
                   │ preload bridge / typed IPC
                   ▼
┌─────────────────────────────────────┐
│ Electron 44 desktop runtime         │
│ main process                        │
├──────────────────┬──────────────────┤
│ JobScoutBackend  │ CareerBackend    │
│                  │                  │
│ sources/jobs     │ Career Profile   │
│ filters/settings │ Applications     │
│ scrape history   │ evidence schema  │
│ scraping         │ artifact dir     │
└────────┬─────────┴─────────┬────────┘
         │                   │
         └─────────┬─────────┘
                   ▼
                SQLite
                   │
                   └── managed filesystem artifacts

Scraping layer
   ├── structured ATS APIs
   ├── generic HTML extraction
   └── hidden browser extraction
```

PR #66 is the R0 implementation branch for this architecture. Until merged, it is in development rather than default-branch reality.

## Runtime Boundaries

### Renderer

The React renderer owns presentation and ordinary user interaction. It does not receive direct Node.js, SQLite, or filesystem authority.

Career Profile and Applications remain native Job Ranger user-facing domains, but R0 moves their persistence behind the trusted desktop boundary. Renderer `localStorage` is retained only as a one-time migration source for users upgrading from the v1.1 renderer-local model.

### Preload / IPC

The preload bridge exposes a constrained typed desktop API to the renderer. IPC is the boundary between user-interface code and privileged desktop behavior.

R0 adds typed Career Profile and Application methods to this boundary. Untrusted IPC values are validated before reaching backend services.

### Desktop backend

`JobScoutBackend` continues to own job-source operations, jobs, filters, settings, scrape history, scraper execution, scheduling, and related runtime behavior.

R0 introduces a dedicated `CareerBackend` and `CareerRepository` rather than turning the scrape backend into a universal service object. They share Job Ranger's existing SQLite database but preserve a clear ownership boundary for Career Profile, Applications, future Career Evidence, and managed career artifacts.

### Persistence

After R0:

- companies, jobs, filters, settings, and scrape history remain SQLite-backed;
- Career Profile is SQLite-backed;
- Applications are SQLite-backed;
- Career Evidence/provenance/resume-artifact tables exist as frozen foundation for later slices;
- large user-provided/generated documents belong in `<userData>/data/artifacts/`, with SQLite metadata and relationships rather than database blobs.

Legacy Career Profile/Application data is migrated idempotently from the v1.1 renderer-local keys. Legacy values are deleted only after the backend confirms successful migration.

Applications created from Find Jobs are populated from backend-owned job/company records rather than accepting renderer-supplied factual snapshots as authority.

## Career Intelligence Architecture

Career Intelligence is native Job Ranger behavior rather than an embedded Career-Ops runtime or a second CLI application.

The current deterministic user flow remains:

```text
Career Profile ──────┐
                     ├──► deterministic fit evaluation ──► Find Jobs guidance
Collected Job Data ──┘

Find Jobs ──► user chooses Track this job ──► Applications
```

R0 changes persistence and authority, not the basic interaction model.

Career Profile owns preferences and intent such as target roles, geography, commute, compensation, and work preferences.

Applications own the user's job-search lifecycle state.

Career Evidence owns factual career history, credentials, projects, accomplishments, source provenance, and future document-derived evidence.

These domains must not silently duplicate or compete for factual authority.

Career-Ops served as implementation ancestry/design evidence for portions of the career-search workflow. Required MIT attribution is preserved in `THIRD_PARTY_NOTICES.md`. Job Ranger remains an independent project and does not embed the Career-Ops runtime.

## Career Evidence Architecture

R0 freezes the durable domain boundary for the next major program:

```text
Source Artifact
      ↓
Extraction Snapshot
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

The canonical product asset is **Career Evidence**, not a PDF, DOCX, JSON Resume object, parser output, or LLM-generated paragraph.

R0 defines shared/backend contracts and SQLite tables for:

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

The exact persistence/artifact/privacy contract is documented in `docs/design/CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md`.

### Evidence authority

Evidence may originate from imported resumes, user entry, future credentials/documents, or assisted extraction. Imported/parser-generated facts do not become trusted merely because parsing succeeded.

R0 establishes the blocking factual-claim invariant:

- user-confirmed or user-authored evidence may support factual generated claims;
- imported evidence cannot support factual generated claims until confirmed;
- inferred-pending evidence cannot support factual generated claims until confirmed;
- rejected or missing evidence cannot support factual generated claims.

Future inference cannot weaken this rule.

### Career Profile relationship

Career Profile remains the user-facing intent/preferences layer.

- target roles, geography, compensation, commute, and work preferences are profile-owned preferences;
- confirmed skills, credentials, experience, projects, and accomplishments can later be surfaced from Career Evidence;
- the profile must not become a second factual store that can silently disagree with Career Evidence.

### Requirement mapping

R2 will normalize tracked-job requirements and map each to evidence as:

- direct;
- transferable;
- ambiguous;
- gap.

A gap cannot silently become a resume claim.

### Review layers

Resume/application-material generation will preserve three separate review systems:

1. **Truth gate:** blocking when factual claims lack supporting confirmed evidence.
2. **Parseability gate:** blocking for critical output failures such as unreadable/image-only artifacts; advisory for lesser structural concerns.
3. **Relevance review:** advisory assessment of whether the truthful artifact makes the strongest case for the target.

A parseable document is not automatically persuasive, and a persuasive document is not allowed to become invented.

## Resume Import and Rendering Strategy

### Import

`firecrawl/anydoc` is the preferred R1 parser candidate, subject to the bounded benchmark in #61 before adoption.

Why it is preferred for evaluation:

- MIT license;
- first-party Node binding aligns with Electron;
- deterministic local DOC/DOCX and text-PDF conversion;
- content-based format detection;
- explicit encrypted/malformed/resource-limit/OCR-required states;
- no cloud/model dependency for ordinary imports.

It is not yet a production dependency. R0 intentionally adopts no parser.

OCR remains a separate future capability. No imported resume should silently leave the machine for hosted OCR.

### Rendering

The initial renderer should reuse Job Ranger's existing Electron/Chromium runtime rather than add another rendering engine immediately.

A dedicated hidden isolated render window can transform a structured projection through Job Ranger-owned HTML/CSS templates and Electron PDF printing.

Initial template scope should remain deliberately small:

1. ATS-safe standard;
2. ATS-safe compact;
3. human-polished conservative.

### Output verification

If the selected import parser reliably handles generated PDFs, Job Ranger should re-parse its own exported PDF and compare extracted content/order with the intended projection. A second spatial PDF parser should be added only if measured gaps justify it.

## Source Architecture

Job Ranger does not use one universal scraper and pretend the internet agreed on markup.

### Structured API adapters

- Greenhouse
- Lever
- SmartRecruiters
- Ashby

### Generic / detected extraction

Workday, iCIMS, BambooHR, Taleo, Oracle Careers, and generic careers pages can be recognized and routed through generic HTML or browser-backed extraction. These paths are intentionally described as best effort.

### Browser-required extraction

Some sources require a rendered browser context. Job Ranger uses a hidden sandboxed Electron `BrowserWindow` with constrained navigation/session behavior for this narrow purpose.

Browser extraction is an untrusted-content boundary and remains isolated from renderer privileges.

## Planned Source Discovery Architecture

Source discovery and source acquisition remain separate concerns.

A future `SourceDiscoveryProvider` seam may help ordinary users find relevant employer career sources from role/geography intent without requiring them to know ATS URLs.

Discovery returns candidates. Users approve sources before they become monitored companies.

No cataloged search/browser platform currently earns default incorporation. Native contracts come first; optional providers can be added later behind those seams.

## Application Lifecycle Architecture

Applications are strategically important native state because they connect jobs, materials, reminders, interviews, and outcomes.

R0 makes the current application records durable and backend-owned. The domain should later evolve toward:

```text
Application
  jobId
  status
  appliedAt
  nextActionAt
  contacts[]
  milestones[]
  notes[]
  artifacts[]
  followUps[]
  outcome?
```

The exact resume/application artifact used should be linked to the application so later interview preparation reasons from what the candidate actually sent.

The application domain should not be outsourced to a generic task/project platform.

## Interview and Story Architecture

Interview preparation should build on the same evidence/application foundation rather than become a separate AI subsystem.

A future `CareerStory` can compose existing evidence for interview prep, resume statements, cover letters, networking, and related narratives without cloning factual history into separate silos.

Career-Ops and the cataloged Interview Prep AI Stack remain workflow/design references, not required runtimes.

## Optional Inference Architecture

Inference remains optional infrastructure. The base application must still function when no provider is configured.

The first inference seam should remain narrow, conceptually:

```text
InferenceProvider
  capability()
  structuredGenerate(request, schema)
```

Potential uses include semantic requirement/evidence mapping, transferable-skill suggestions, resume phrasing assistance, interview question generation, repeated gap synthesis, and optional research summaries.

Requirements:

- explicit disclosure before remote inference receives personal career data;
- structured outputs validated before use;
- evidence linking for factual claims;
- deterministic fallback when inference is absent;
- no silent transmission of resumes/profile/evidence;
- no inference path may bypass R0 truth authority.

Job Ranger does not currently need a general-purpose agent framework.

## Notifications, Scheduling, and External Integrations

Desktop reminders/background work should continue to use SQLite state and Job Ranger's existing OS notification/tray infrastructure.

Future calendar/email/notification integrations, if justified, should be optional adapters. They may mirror or act on Job Ranger state but do not become canonical owners.

## Export and Portability

As Career Evidence and Applications become valuable durable state, Job Ranger should provide a native versioned export/import bundle before considering cloud sync.

Conceptually:

```text
job-ranger-export.zip
  manifest.json
  profile.json
  evidence.json
  applications.json
  sources.json
  jobs.json
  artifacts/
```

JSON Resume may later be an interoperability import/export adapter, but it is not the complete Job Ranger backup schema or canonical evidence model.

## Security Boundaries

The desktop shell uses:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- a preload boundary;
- external URL validation before opening the system browser;
- a renderer Content Security Policy;
- `X-Frame-Options: DENY` response headers for the renderer;
- sandboxing for the help window.

Any change that weakens those boundaries is a high-impact governance change, not an implementation convenience.

Career Evidence adds another untrusted-input boundary: uploaded resumes/documents.

Document ingestion must include file/size validation, content-based format detection, decompression/nesting/resource limits, no macro execution, no embedded-link execution, no automatic network fallback, constrained parser execution outside renderer privileges where practical, and explicit OCR/inference disclosure before personal documents leave the machine.

## Runtime and Build Architecture

The v1.1.x baseline is deliberately coordinated:

- Node.js `>=22.12.0`;
- Electron `44.4.5`;
- Vite `8.x`;
- TypeScript `7.0.2`;
- React `19.2.3`;
- Electron Builder `26.x`.

R0 validation exposed a pre-existing build-layout defect tracked by #67: TypeScript Electron source lives under `electron/src`, while development/package/test entry points still consume checked-in root `electron/*.cjs` runtime files.

PR #66 synchronizes both representations for the R0 implementation and proves the packaged runtime through Electron E2E. This duplication is transitional, not the intended architecture. Before the backend expands substantially through R1-R5, #67 should make one authoritative source tree deterministically generate the exact runtime consumed by development, tests, Electron Builder, and releases.

## Quality Architecture

Automated layers include:

- TypeScript typechecking;
- Vite production build validation;
- desktop TypeScript compilation;
- backend smoke tests;
- Career persistence/migration/provenance smoke tests;
- focused unit tests;
- Electron Playwright E2E coverage;
- PR and `main` CI;
- dependency audit reporting.

R0 adds deterministic coverage for migrations 3/4, Profile/Application restart persistence, legacy migration idempotence, artifact-directory creation, evidence-table presence, and factual truth authority.

The Electron E2E suite passes 13/13 on the R0 branch after the persistence boundary change.

Future Career Evidence work adds deterministic benchmark/fixture suites for resume import, requirement/evidence mapping, generated-PDF parseability, artifact/application linkage, and export/restore.

Inference features require their own golden evaluation sets and cannot weaken deterministic truth gates.

## External Capability Policy

Open-source projects can be implementation ancestry, evidence, or code donors when licensing permits.

Preferred adoption classes:

- MIT;
- Apache-2.0 with required notice/attribution handling;
- other clearly compatible permissive licenses after explicit review.

Reference-only by default:

- AGPL/GPL network/copyleft components;
- SSPL;
- source-available licenses;
- noncommercial/share-alike templates/content;
- custom commercial-threshold licenses;
- proprietary services;
- no-license repositories.

A permissive repository license does not automatically cover bundled templates, fonts, model weights, datasets, plugins, or hosted services.

Every adopted component must be reviewed at the exact code/asset/dependency boundary and recorded in `THIRD_PARTY_NOTICES.md` where required.

## Evolution Plan

### R0. Durable Career Intelligence persistence and contract freeze

Implemented by PR #66 and tracked by #60:

- backend/SQLite Career Profile persistence;
- backend/SQLite Applications persistence;
- one-time legacy renderer-local migration;
- Career Evidence shared/backend contracts;
- deterministic migrations;
- managed artifact-storage contract;
- occupation-diverse benchmark corpus;
- truth/provenance tests;
- inference/privacy authority boundary.

R0 must be merged and #67 build-runtime debt should be addressed before the Electron backend grows significantly further.

### R1. Resume import and evidence review

Tracked by #61:

- run the bounded parser bake-off;
- adopt a parser only if it clears the acceptance gate;
- preserve source artifacts before interpretation;
- normalize into evidence with confidence/provenance;
- give users confirm/edit/reject controls;
- synchronize confirmed factual evidence into appropriate product surfaces without duplicating authority.

### R2. Requirement/evidence mapping

Tracked by #62:

- normalize tracked-job requirements;
- classify direct/transferable/ambiguous/gap;
- preserve explicit evidence links;
- keep gaps from becoming claims.

### R3. Deterministic resume creation and artifact lifecycle

Tracked by #63:

- build versioned resume projections from confirmed evidence;
- render through Job Ranger-owned templates using Electron/Chromium;
- enforce truth and critical parseability gates;
- link exact artifacts to Applications.

### R4. Target-specific tailoring and optional inference

Tracked by #64:

- add provider-agnostic assistance only after deterministic evidence paths exist;
- keep all assisted factual language evidence-backed;
- preserve full no-provider operation.

### R5. Application materials, interview preparation, follow-up, and portability

Tracked by #65:

- application-material lifecycle;
- follow-up/reminders;
- interview preparation and evidence-backed story reuse;
- offers/outcomes;
- export/backup and portability.

### Ongoing source and packaging maturity

Continue evidence-based improvements for dynamic source families, maintain Windows/macOS packaging confidence, validate notarization whenever production Apple credentials are available, and decide explicitly whether Linux becomes a supported packaged target.

## Architectural Non-Goals

Job Ranger should not become:

- a collection of occupation-specific forks;
- a thin wrapper around a second CLI runtime;
- inference-dependent for basic product operation;
- a cloud backend solely because cloud architecture is fashionable;
- a generic agent framework/workflow engine;
- an agent-memory platform;
- a managed-browser client by default;
- a vector database project without measured need;
- an autonomous mass-application system without explicit product and governance decisions.

## Third-Party Mechanisms

Career-Ops-related concepts used in the Career Intelligence foundation are native Job Ranger functionality. Attribution and the independence/trademark boundary are documented in `THIRD_PARTY_NOTICES.md`.

Resume/import research and product-wide catalog reconciliation live under `docs/research/`; the implementation-oriented resume/evidence design and R0 persistence contract live under `docs/design/`.
