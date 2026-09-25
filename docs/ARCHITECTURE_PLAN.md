# Architecture and Evolution Plan

This document describes Job Ranger's current architecture and intended direction. Older phase plans are historical implementation records, not current product status.

## Product Architecture Principle

Job Ranger is a focused job-search companion, not an agent platform.

> **Job Ranger owns career truth, job-search state, and the user's application lifecycle. External capabilities are narrow replaceable adapters, never authorities.**

Consequences:

- a parser may extract evidence but cannot establish truth;
- an inference provider may propose language or mappings but cannot establish truth;
- a search provider may discover sources but cannot silently add trusted sources;
- a renderer formats an artifact but does not become canonical storage;
- a browser retrieves pages but does not silently submit consequential actions;
- a calendar/notification integration may mirror state but does not own the application lifecycle.

The maintained Technical Capability Catalog is an implementation/research source, not an adoption queue.

## Current Runtime Architecture

```text
┌─────────────────────────────────────────────┐
│ React renderer                              │
│ Home / Find Jobs / Applications             │
│ Career Profile / Resume / Companies         │
│ Filters / Settings                          │
└────────────────────┬────────────────────────┘
                     │ typed preload / IPC
                     ▼
┌─────────────────────────────────────────────┐
│ Electron main process                       │
├─────────────────────────────────────────────┤
│ JobScoutBackend                             │
│   sources / jobs / filters / settings       │
│   scrape history / scheduling / notices     │
│                                             │
│ CareerBackend                               │
│   Career Profile / Applications             │
│   source artifacts / extraction snapshots  │
│   Career Evidence / provenance              │
│                                             │
│ RequirementBackend                          │
│   explicit job requirements                 │
│   requirement ↔ Career Evidence mappings   │
│                                             │
│ ResumeService                               │
│   projections / statements                  │
│   Truth Gate                                │
│   PDF render + Parseability Gate            │
│   versioned artifacts / application links   │
└────────────────────┬────────────────────────┘
                     ▼
                   SQLite
                     │
                     └── managed filesystem artifacts
```

The renderer owns presentation and user interaction. It does not receive direct Node.js, SQLite, parser, Chromium-renderer, or arbitrary filesystem authority.

## Build and Runtime Authority

`electron/src/**` is the only checked-in privileged implementation source.

```text
electron/src
    ↓ TypeScript
 electron-runtime/
    ↓
dev / smoke tests / Electron E2E / Electron Builder / packaged app
```

`electron-runtime/` is generated and ignored. Compatibility shims exist only where older tests still require them; they contain no implementation logic.

New backend modules should be consumed from the generated runtime rather than adding another checked-in compiled representation.

## Career Domain Authority

### Career Profile

Owns intent and preferences:

- target/current/adjacent roles;
- geography/commute preferences;
- compensation preferences;
- work-setting preferences.

Career Profile is not the canonical factual history store.

### Career Evidence

Owns factual career history and provenance:

- roles;
- skills;
- credentials;
- education;
- projects;
- achievements;
- publications;
- provenance back to imported/user-authored sources.

Only `user-confirmed` or `user-authored` evidence may support factual resume/application claims. Imported and inferred-pending evidence remain proposals until the user accepts them.

### Applications

Own the job-search lifecycle:

- tracked opportunity;
- status;
- notes;
- linked submitted artifacts;
- future contacts, milestones, reminders, follow-ups, and outcomes.

Applications should not be outsourced to a generic task/project system.

## Career Evidence Pipeline

```text
Source Artifact
      ↓
Extraction Snapshot
      ↓
Candidate Evidence
      ↓ user confirmation
Confirmed Career Evidence
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

The canonical product asset is **Career Evidence**, not a PDF, DOCX, JSON Resume object, parser output, or generated paragraph.

## Resume Import Architecture

R1 uses exactly one default document parser: `@firecrawl/anydoc@0.2.4`.

Supported initial paths:

- DOCX through Anydoc;
- text-bearing PDF through Anydoc;
- plain text natively;
- pasted text natively.

Import rules:

1. preserve the original artifact first;
2. compute SHA-256 before interpretation;
3. detect/validate format from content where applicable;
4. extract locally;
5. persist parser identity/version, raw extraction snapshot, warnings, and failure state;
6. normalize only to proposed evidence;
7. require human authority before factual use.

Image-only/scanned documents surface `needs-ocr`. Job Ranger does not silently send resumes to hosted OCR or inference providers.

## Requirement Mapping Architecture

R2 normalizes explicit requirements from collected job text into durable `JobRequirement` records and classifies them as:

- must-have;
- preferred;
- responsibility;
- credential;
- logistics.

Mappings are:

- direct;
- transferable;
- ambiguous;
- gap.

Only confirmed/user-authored evidence can become direct or transferable factual support. Imported/unconfirmed evidence remains ambiguous. Gaps remain gaps.

The current boundary is conservative because Job Ranger does not yet retain a canonical complete job description for every source. Requirement reasoning must never imply completeness over text the application never ingested.

## Deterministic Resume Architecture

R3 makes resume creation a projection of confirmed evidence rather than a free-form generation task.

### Projection

A `ResumeProjection` captures:

- optional target job;
- context (`private-sector`, `hybrid`, `federal`, `academic`);
- page format;
- Job Ranger-owned template ID;
- immutable contact snapshot;
- selected evidence IDs;
- section ordering;
- lineage/status metadata.

A `ResumeStatement` remains linked to supporting evidence IDs.

### Template strategy

Initial templates are deliberately few and Job Ranger-owned:

- `ats-standard-v1`;
- `ats-compact-v1`.

Do not import a marketplace/template ecosystem merely because one exists. A conservative polished template may be added later only if it retains parseability.

### Truth Gate

The Truth Gate blocks export when a factual statement:

- lacks supporting evidence;
- depends on unconfirmed evidence;
- introduces unsupported factual terms through editing.

Deterministic composition begins from the confirmed Career Evidence statement itself. R4 may add evidence-bound rewriting, but cannot weaken this gate.

### PDF rendering

R3 reuses Electron/Chromium rather than adding another rendering runtime.

The hidden render window uses:

- sandboxing;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- JavaScript disabled;
- denied window opening and navigation;
- an embedded CSP with `default-src 'none'`;
- HTML-escaped user content.

No remote resource is required to render a resume.

### Parseability Gate

After Chromium emits the PDF, Job Ranger reparses it through the same Anydoc boundary where viable.

Critical/advisory checks include:

- extractable text;
- contact extraction;
- required section/content presence;
- materially correct reading order/content retention;
- no hidden-content keyword-stuffing pattern;
- parser success.

Critical failures prevent artifact finalization.

### Artifact lifecycle

A finalized `ResumeArtifact` records:

- projection ID;
- version;
- managed path;
- SHA-256 hash;
- page count;
- Truth Gate result;
- Parseability Gate result;
- immutable projection/statement snapshot;
- creation timestamp.

Version comparison uses stored snapshots rather than filenames. Targeted exports can link the exact artifact to a tracked Application.

Multi-record projection/artifact writes use a single-process SQLite transaction. `SqliteClient` does not hold a persistent connection, so transactions must never be assembled across independent `exec()` calls.

## Source Acquisition Architecture

Job Ranger intentionally avoids one universal scraper.

Structured API adapters:

- Greenhouse;
- Lever;
- SmartRecruiters;
- Ashby.

Best-effort HTML/browser paths include Workday, iCIMS, BambooHR, Taleo, Oracle Careers, and generic career pages.

Browser-required extraction uses a constrained hidden Electron browser boundary. Unknown sources fail honestly rather than being represented as successful.

Source discovery remains separate from source acquisition. A future `SourceDiscoveryProvider` may discover candidates, but users approve sources before monitoring begins.

## Optional Inference Architecture

R0-R3 require no inference provider.

R4 may add a deliberately narrow provider-neutral seam, conceptually:

```text
InferenceProvider
  capability()
  structuredGenerate(request, schema)
```

Potential uses:

- semantic requirement/evidence mapping proposals;
- evidence-bound phrasing alternatives;
- transferable-skill suggestions;
- optional relevance/hiring-manager review;
- interview preparation in later phases.

Hard requirements:

- explicit disclosure before personal career data leaves the device;
- structured output validation;
- evidence linkage for factual claims;
- deterministic fallback when inference is absent;
- no silent resume/profile transmission;
- no provider may bypass Career Evidence authority or the Truth Gate.

Job Ranger does not currently need a general-purpose agent framework, workflow engine, vector database, or agent-memory runtime.

## Security Boundaries

The desktop shell uses:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- typed preload APIs;
- URL validation before external navigation;
- renderer Content Security Policy;
- sandboxed specialized browser/render surfaces;
- managed artifact storage;
- content/size validation for imported career documents.

Any weakening of these boundaries is a material governance change, not an implementation convenience.

## Persistence Strategy

SQLite owns structured durable metadata and relationships. Managed files live under the Job Ranger data/artifact directory rather than as database blobs.

Current durable domains include:

- companies/jobs/filters/settings/scrape history;
- Career Profile;
- Applications;
- source artifacts/extraction snapshots;
- Career Evidence/provenance;
- normalized job requirements/mappings;
- resume projections/statements;
- resume artifacts/snapshots;
- application-artifact links.

A future export/restore feature should bundle structured state plus managed artifacts before cloud sync is considered.

## Quality Architecture

Normal PR/main validation includes:

- `npm ci`;
- dependency audit;
- TypeScript checks;
- Vite production build;
- generated Electron runtime compilation;
- backend smoke tests;
- Career persistence tests;
- resume import tests;
- requirement mapping/persistence tests;
- deterministic resume lifecycle tests.

Substantial desktop workflow changes additionally receive Electron Playwright validation. Release candidates receive platform packaging validation appropriate to the supported Windows/macOS targets.

## Evolution Plan

### R0: complete

Durable Career Profile/Application persistence and Career Evidence contract foundation.

### R1: complete

Local resume import, source preservation, evidence proposals, provenance, and human review.

### R2: complete

Deterministic job requirement ↔ Career Evidence mapping and Find Jobs coverage UX.

### R3: implementation complete pending final PR validation

Deterministic resume workspace, Truth Gate, isolated Chromium rendering, Parseability Gate, versioned artifacts, diffs, and Application linkage.

### R4: next

Target-specific deterministic tailoring plus optional evidence-bound inference behind a provider-neutral seam.

### R5: planned

Broader application materials, follow-up/reminders, contacts/milestones, interview preparation, Career Stories, offer/negotiation support, and portable export/restore.

## External Capability Policy

Open-source projects may be implementation ancestry, benchmarks, or code donors when the exact boundary is license-compatible.

Preferred adoption classes:

- MIT;
- Apache-2.0 with required notices;
- other clearly compatible permissive licenses after explicit review.

Reference-only by default:

- AGPL/GPL/copyleft components where obligations conflict with product goals;
- SSPL;
- source-available licenses;
- noncommercial/share-alike templates/content;
- custom commercial-threshold licenses;
- proprietary services;
- no-license repositories.

A permissive repository license does not automatically relicense bundled templates, fonts, models, datasets, plugins, or hosted services.

Every adopted component must be reviewed at the exact code/asset/dependency boundary and attributed in `THIRD_PARTY_NOTICES.md` where required.
