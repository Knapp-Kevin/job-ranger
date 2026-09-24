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
│ main process + backend              │
└──────────┬───────────┬──────────────┘
           │           │
           │           ├──────────────► OS integration
           │           │                notifications / tray / shell
           ▼           ▼
        SQLite      Scraping layer
                       │
             ┌─────────┼───────────┐
             ▼         ▼           ▼
         ATS APIs   HTML path   Browser path

Renderer-local Career Profile / Applications
        │
        └── planned migration to backend + SQLite
```

## Runtime Boundaries

### Renderer

The React renderer owns presentation and ordinary user interaction. It does not receive direct Node.js access.

The Career Profile and Applications domains are native Job Ranger functionality in v1.1.x. Their current persistence is renderer-local; this is an acknowledged transitional boundary, not the intended final storage architecture.

### Preload / IPC

The preload bridge exposes a constrained desktop API to the renderer. IPC is the boundary between user-interface code and privileged desktop behavior.

### Desktop backend

The backend owns SQLite persistence, scraper execution, source classification, runtime settings, scrape guards, and application-level desktop services.

### Persistence

Current durable backend state is SQLite-backed for companies, jobs, filters, settings, and scrape history.

Career Profile and Applications are local in v1.1.2 but still use renderer-local storage. Their next architectural step is migration behind the same backend repository boundary, with data migration rather than casually abandoning existing local state.

Future Career Evidence, resume artifacts, application milestones, reminders, and related lifecycle state also belong behind this backend boundary.

Large user-provided/generated documents should live in a managed Job Ranger artifact directory with SQLite metadata, hashes, provenance, and relationships. SQLite should not become an accidental binary-file warehouse.

## Career Intelligence Architecture

Career Intelligence is native Job Ranger behavior rather than an embedded Career-Ops runtime or a second CLI application.

The current deterministic flow is:

```text
Career Profile ──────┐
                     ├──► deterministic fit evaluation ──► Find Jobs guidance
Collected Job Data ──┘

Find Jobs ──► user chooses Track this job ──► Applications
```

The scorer uses explicit profile information and collected listing evidence. It is designed for prioritization and explanation, not as a hiring-outcome prediction.

Career-Ops served as implementation ancestry/design evidence for portions of the career-search workflow. Required MIT attribution is preserved in `THIRD_PARTY_NOTICES.md`. Job Ranger remains an independent project and does not embed the Career-Ops runtime.

## Planned Career Evidence Architecture

The next major domain extends Career Intelligence with a durable evidence model.

The accepted direction is:

```text
Source Artifact
      ↓
Candidate Evidence
      ↓
Target Requirements ↔ Evidence Mapping
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

Planned core domain concepts are described in `docs/design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md` and include:

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

### Evidence authority

Evidence may originate from imported resumes, user entry, future credentials/documents, or assisted extraction. Imported/parser-generated facts do not become trusted merely because parsing succeeded.

Verification state and provenance must remain visible and durable.

### Career Profile relationship

Career Profile remains the user-facing intent/preferences layer.

- target roles, geography, compensation, commute, and work preferences are profile-owned preferences;
- confirmed skills, credentials, experience, projects, and accomplishments can be surfaced from Career Evidence;
- the profile should not become a second factual store that can silently disagree with Career Evidence.

### Requirement mapping

Tracked jobs will eventually normalize requirements and map each to evidence as:

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

These concerns remain separate so a parseable document is not mistaken for a persuasive document and a persuasive document is not allowed to become an invented one.

## Resume Import and Rendering Strategy

The Technical Capability Catalog/QOR work deliberately narrowed the external tool set.

### Import

`firecrawl/anydoc` is the preferred R1 parser candidate, subject to a bounded benchmark before adoption.

Why it is preferred for evaluation:

- MIT license;
- first-party Node binding aligns with Electron;
- deterministic local DOC/DOCX and text-PDF conversion;
- content-based format detection;
- explicit encrypted/malformed/resource-limit/OCR-required states;
- no cloud/model dependency for ordinary imports.

It is not yet a production dependency. The benchmark must establish extraction quality, failure behavior, packaging, performance, and transitive-license clarity.

OCR remains a separate future capability. No imported resume should silently leave the machine for hosted OCR.

### Rendering

The initial renderer should reuse Job Ranger's existing Electron/Chromium runtime rather than add a second rendering engine immediately.

A dedicated hidden isolated render window will transform a structured projection through Job Ranger-owned HTML/CSS templates and Electron PDF printing.

Initial template scope should remain deliberately small:

1. ATS-safe standard;
2. ATS-safe compact;
3. human-polished conservative.

Do not import a giant third-party template pack merely because one exists.

### Output verification

If the selected import parser reliably handles generated PDFs, Job Ranger should re-parse its own exported PDF and compare extracted content/order with the intended projection. This lets one parser serve both import normalization and output parseability verification.

Adopt a second PDF/spatial parser only if a measured gap justifies another dependency.

## Source Architecture

Job Ranger does not use one universal scraper and pretend the internet agreed on markup.

### Structured API adapters

- Greenhouse
- Lever
- SmartRecruiters
- Ashby

These are the preferred paths where a structured job-board API can be used reliably.

### Generic / detected extraction

Workday, iCIMS, BambooHR, Taleo, Oracle Careers, and generic careers pages can be recognized and routed through generic HTML or browser-backed extraction. These paths are intentionally described as best effort.

### Browser-required extraction

Some sources require a rendered browser context. Job Ranger already uses a hidden sandboxed Electron `BrowserWindow` with constrained navigation/session behavior for this narrow purpose.

The broader capability-catalog reconciliation found no justification to replace this with Browserless, Steel, Cloudflare Browser Run, Firecrawl, Notte, or another browser platform as a default runtime dependency.

Browser extraction is an untrusted-content boundary and should remain isolated from renderer privileges.

## Planned Source Discovery Architecture

Source discovery and source acquisition remain separate concerns.

A future `SourceDiscoveryProvider` seam may help ordinary users find relevant employer career sources from role/geography intent without requiring them to know ATS URLs.

Conceptually:

```text
SourceDiscoveryQuery
  targetRoles[]
  geography
  employerHints[]
  remotePreference

SourceDiscoveryCandidate
  employer
  careersUrl
  detectedSourceFamily?
  confidence
  evidence
  provider
```

Discovery returns **candidates**. Users approve sources before they become monitored companies.

The catalog contains broad search/research platforms, but none currently earns default incorporation. The native contract should be defined first; optional external search can be added later behind that seam.

## Application Lifecycle Architecture

Applications are strategically important native state because they connect jobs, materials, reminders, interviews, and outcomes.

The domain should evolve toward:

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

The application domain should not be outsourced to a generic task/project platform.

The exact resume/application artifact used should be linked to the application so later interview preparation reasons from what the candidate actually sent.

## Interview and Story Architecture

Interview preparation should build on the same evidence/application foundation rather than become a separate AI toy.

A future `CareerStory` can compose existing evidence:

```text
CareerStory
  id
  title
  evidenceIds[]
  situation
  challenge
  action
  result
  reflection
  tags[]
```

This can support interview prep, resume statements, cover letters, networking, and other career narratives without cloning factual history into separate silos.

Career-Ops and the cataloged Interview Prep AI Stack remain workflow/design references, not required runtimes.

## Optional Inference Architecture

Inference remains optional infrastructure. The base application must still function when no provider is configured.

Job Ranger does not currently need a general-purpose agent framework.

The first inference seam should be deliberately narrow, conceptually:

```text
InferenceProvider
  capability()
  structuredGenerate(request, schema)
```

Potential uses include:

- semantic requirement/evidence mapping;
- transferable-skill suggestions;
- resume phrasing assistance;
- interview question generation;
- repeated gap synthesis;
- optional company/role research summaries.

Requirements:

- explicit user disclosure before remote inference receives personal career data;
- structured outputs validated before use;
- evidence linking for factual claims;
- deterministic fallback when inference is absent;
- no silent transmission of resumes/profile/evidence.

If future workflows become sufficiently agentic to justify orchestration infrastructure, reevaluate that problem then rather than pre-installing an agent platform for hypothetical autonomy.

## Notifications, Scheduling, and External Integrations

Desktop reminders/background work should continue to use SQLite state and Job Ranger's existing OS notification/tray infrastructure.

Do not add a workflow engine to schedule recruiter follow-ups.

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

JSON Resume may later be an interoperability import/export adapter for career-document data, but it is not the complete Job Ranger backup schema or canonical evidence model.

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

Document ingestion must include:

- file/size validation;
- content-based format detection;
- decompression/nesting/resource limits;
- no macro execution;
- no embedded-link execution;
- no automatic network fallback;
- constrained parser execution outside renderer privileges where practical;
- explicit OCR/inference disclosure before any personal document leaves the machine.

## Runtime and Build Architecture

The v1.1.x baseline is deliberately coordinated:

- Node.js `>=22.12.0`;
- Electron `44.4.5`;
- Vite `8.x`;
- TypeScript `7.0.2`;
- React `19.2.3`;
- Electron Builder `26.x`.

Electron ecosystem tooling includes the Node 22-compatible `@electron/notarize` 3.x and `@electron/fuses` 2.x lines. The Electron Builder notarization hook remains CommonJS and dynamically imports the ESM-only notarization package when Apple credentials are available.

Major runtime/toolchain upgrades should continue to be treated as coordinated compatibility migrations rather than independent dependency bumps.

## Quality Architecture

Automated layers include:

- TypeScript typechecking;
- Vite production build validation;
- desktop TypeScript compilation;
- backend smoke tests;
- focused unit tests;
- Electron Playwright E2E coverage;
- PR and `main` CI;
- dependency audit reporting.

The current Electron E2E suite passes 13/13 on the Electron 44 runtime. Passing CI is a gate, not a claim that every third-party careers portal or every supported OS has been fully exercised.

Future Career Evidence work adds deterministic benchmark/fixture suites for:

- resume import corpus;
- requirement/evidence mapping;
- truth gating;
- generated-PDF parseability;
- artifact/application linkage;
- migrations/export/restore.

Inference features should have their own golden evaluation sets and must not weaken deterministic truth gates.

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

### 1. Durable Career Intelligence persistence

Move Career Profile and Applications behind the desktop backend and SQLite repository boundary.

The migration should preserve existing user data where practical and add deterministic persistence/scorer coverage.

### 2. Career Evidence contract freeze

Before resume UI implementation:

- freeze core evidence/provenance contracts;
- define SQLite migrations;
- define managed artifact storage;
- build the occupation-diverse benchmark corpus;
- define truth/parseability fixtures;
- freeze inference/privacy boundaries.

### 3. Resume import and evidence review

- run the bounded parser bake-off;
- adopt only the best-fit parser if it clears the acceptance gate;
- preserve source artifacts before interpretation;
- normalize into evidence with confidence/provenance;
- give users confirm/edit/reject controls;
- synchronize confirmed evidence into Career Profile surfaces.

### 4. Requirement/evidence mapping and deterministic resume output

- normalize tracked-job requirements;
- classify direct/transferable/ambiguous/gap;
- build versioned resume projections from confirmed evidence;
- render through Job Ranger-owned templates using Electron/Chromium;
- enforce truth and critical parseability gates;
- link exact artifacts to Applications.

### 5. First-run and consumer-friendly discovery

Use the richer profile/evidence model to improve first-run guidance and source discovery without requiring ATS knowledge.

Source discovery remains separate from extraction adapters.

### 6. Optional inference

Add provider-agnostic assistance only after deterministic evidence paths are complete.

Inference may enrich:

- fuzzy experience matching;
- richer fit explanations;
- resume tailoring;
- interview preparation;
- transferable-skill analysis;
- skill/credential gap synthesis.

Inference remains optional infrastructure and cannot establish career truth.

### 7. Application workflow maturity

Build follow-up, contacts, interview milestones, story reuse, offers, export/backup, and useful summaries on the native application/evidence foundation.

### 8. Source and packaging maturity

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

Resume/import research and product-wide catalog reconciliation live under `docs/research/`; the implementation-oriented resume/evidence design lives under `docs/design/`.
