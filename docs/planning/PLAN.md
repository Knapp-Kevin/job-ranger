# Job Ranger Roadmap

**Current as of:** 2026-10-01

This is the active roadmap. Historical phase/remediation plans under `docs/` remain implementation provenance only.

## North Star

Job Ranger is a job search companion.

The product should help a user:

1. find opportunities;
2. understand which ones deserve attention;
3. prepare factual application materials;
4. track applications and what happened;
5. prepare for the next step;
6. learn from the search without turning the search itself into another job.

Core functionality remains useful without inference. Optional inference may improve guidance and language, but it does not own factual authority or determine whether the application is usable.

The universal product contract is now expressed through user stories rather than occupation-specific assumptions:

> **US-0:** As a job seeker, I want Job Ranger to adapt to the way my career works without requiring me to understand how Job Ranger works.

See [`../design/UNIVERSAL_USER_STORIES.md`](../design/UNIVERSAL_USER_STORIES.md) and program issue #81.

## Current Release Boundary

The published installers remain **v1.1.2**.

Development on `main` is materially ahead of that release. R0-R3 of the Career Evidence program are implemented on `main`, but are not yet represented by a published installer.

## Completed Foundation

### Desktop, runtime, and persistence

- [x] Electron desktop application
- [x] React renderer
- [x] typed preload/IPC boundary
- [x] local SQLite authority for product state
- [x] generated Electron runtime from authoritative `electron/src`
- [x] Node.js 22.12+ / Electron 44.4.5 / Vite 8 / TypeScript 7 baseline
- [x] Windows self-contained SQLite packaging
- [x] macOS x64/arm64 packaging
- [x] zero-known-vulnerability npm audit baseline
- [x] PR CI and Electron Playwright coverage

### Job discovery and monitoring foundation

- [x] company/career-source management
- [x] Greenhouse, Lever, SmartRecruiters, and Ashby structured adapters
- [x] generic HTML/browser-backed fallback paths
- [x] explicit source-support classification
- [x] scrape history
- [x] cooldown/circuit-breaker behavior
- [x] filters for title, keywords, location, and compensation
- [x] desktop notifications and tray behavior

### Career workflow foundation

- [x] occupation-agnostic Career Profile
- [x] hourly or annual pay preferences
- [x] deterministic profile-to-listing fit guidance
- [x] Applications workspace, statuses, and notes
- [x] consumer-oriented navigation
- [x] Career-Ops attribution and independence boundary

## Universal User Stories Program / #81

**Status: active.**

This program makes user stories the normative product contract and uses diverse career contexts as validation fixtures. It does not replace the Career Evidence program; it coordinates consumer-facing behavior across it.

### U1 / #82: progressive first-run onboarding

- [ ] resume-first onboarding
- [ ] no-resume guided evidence entry
- [ ] goal-first onboarding
- [ ] partial profiles remain valid and resumable
- [ ] no technical/provider configuration required

### U2 / #83: target tracks, preferences, and constraints

- [ ] multiple target tracks
- [ ] explicit required vs preferred vs target semantics
- [ ] work arrangement, schedule, travel, relocation, geography, and work-mode preferences where relevant
- [ ] hourly/annual compensation floors and targets preserve meaning
- [ ] migration preserves existing Career Profile intent

### U3 / #84: extensible Career Evidence

- [ ] represent conventional and nontraditional career evidence without separate truth stores
- [ ] model credentials/licenses with relevant structured facts
- [ ] preserve provenance and authority state through edit/merge/reject/supersede
- [ ] allow matching to consume relevant non-employment evidence

### U4 / #85: consumer-friendly opportunity/source discovery

- [ ] define native `SourceDiscoveryProvider`
- [ ] discover employers/sources from target track + geography
- [ ] normalize discovery across appropriate source classes without exposing ATS internals
- [ ] require approval before discovered sources become monitored/trusted
- [ ] preserve support/trust/provenance metadata

### U5 / #86: explainable opportunity assessment

- [ ] separate eligibility/blockers from evidence coverage
- [ ] assess career-track alignment separately from profile-title similarity
- [ ] distinguish hard constraints from preference misses
- [ ] show unknown/missing/uncertain information explicitly
- [ ] do not present one opaque percentage as hiring probability or universal fit truth

### U6 / #88: downstream story reconciliation

- [ ] #64 satisfies US-19/US-20 for truthful target-specific resume work
- [ ] #65 satisfies application-material, submitted-artifact, contact, reminder, interview, and recurring-gap stories
- [ ] add observed outcome analytics for US-28 without causal overclaiming
- [ ] add evidence-based strategy signals for US-29 without activity quotas

### U7 / #87: cross-career validation

- [ ] maintain a version-controlled US-0 through US-30 validation matrix
- [ ] maintain synthetic fixtures for materially different career contexts
- [ ] validate UX relevance, not only type/schema acceptance
- [ ] use automated domain/Electron coverage where practical

The program completion rule is defined in #81 and [`../design/UNIVERSAL_USER_STORIES.md`](../design/UNIVERSAL_USER_STORIES.md).

## Career Evidence and Resume Intelligence Program

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

Research and design:

- [`../research/RESUME_INTELLIGENCE_QOR.md`](../research/RESUME_INTELLIGENCE_QOR.md)
- [`../research/RESUME_INTELLIGENCE_CATALOG_HARVEST.md`](../research/RESUME_INTELLIGENCE_CATALOG_HARVEST.md)
- [`../research/JOB_RANGER_CAPABILITY_CATALOG_RECONCILIATION.md`](../research/JOB_RANGER_CAPABILITY_CATALOG_RECONCILIATION.md)
- [`../design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md`](../design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md)
- [`../design/CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md`](../design/CAREER_EVIDENCE_PERSISTENCE_CONTRACT.md)

### R0 / #60: durable Career Intelligence and contract freeze

**Status: complete.**

- [x] Career Profile moved to SQLite/backend authority
- [x] Applications moved to SQLite/backend authority
- [x] one-time renderer-local migration
- [x] Career Evidence/provenance contracts frozen
- [x] requirement/evidence contracts frozen
- [x] resume projection/artifact contracts frozen
- [x] managed artifact-directory and hashing rules
- [x] privacy/inference authority boundary
- [x] occupation-diverse benchmark corpus
- [x] restart/migration/truth regression coverage

### R1 / #61: resume import and Career Evidence review

**Status: complete.**

- [x] bounded parser bake-off
- [x] `@firecrawl/anydoc@0.2.4` selected and license-reviewed
- [x] DOCX and text-bearing PDF import
- [x] native plain/pasted text import
- [x] original artifact preservation before interpretation
- [x] SHA-256 hashing and duplicate detection
- [x] parser/version extraction snapshots
- [x] deterministic proposed Career Evidence
- [x] confirm/edit/reject/merge authority workflow
- [x] explicit OCR-required/encrypted/malformed/unsupported/resource-limit states
- [x] hosted OCR/inference excluded from the default import path
- [x] packaged native parser proof

Scanned/image-only OCR remains a later explicit capability rather than a silent network fallback.

### R2 / #62: job requirement ↔ Career Evidence mapping

**Status: complete.**

- [x] explicit requirement normalization
- [x] must-have / preferred / responsibility / credential / logistics classification
- [x] direct / transferable / ambiguous / gap evidence mapping
- [x] confirmed evidence required for direct/transferable factual support
- [x] imported/unconfirmed evidence remains ambiguous
- [x] visible gaps rather than fabricated claims
- [x] durable mapping persistence
- [x] Find Jobs Evidence coverage UI
- [x] Prepare resume handoff
- [x] occupation-diverse deterministic test coverage

Known limitation: requirement coverage can only reason over job text actually collected by Job Ranger. Canonical full-description preservation remains a future source-ingestion improvement.

### R3 / #63: deterministic resume creation and artifact lifecycle

**Status: complete on `main` through PR #75.**

- [x] structured `ResumeProjection` / `ResumeStatement` lifecycle
- [x] Job Ranger-owned ATS-safe standard template
- [x] Job Ranger-owned ATS-safe compact template
- [x] confirmed-evidence-only deterministic composition
- [x] job-targeted evidence preselection from R2 coverage
- [x] blocking Truth Gate
- [x] isolated Electron/Chromium PDF renderer
- [x] generated-PDF reparse through Anydoc
- [x] critical/advisory Parseability Gate
- [x] versioned PDF artifacts with hashes/page counts/gate reports
- [x] immutable projection snapshot per artifact
- [x] version comparison/diff
- [x] exact Application artifact linkage
- [x] Resume workspace and top-level navigation
- [x] artifact reveal/version UX
- [x] deterministic lifecycle smoke coverage
- [x] Electron product validation on the merge candidate
- [x] PR #75 merged

R3 remains deterministic and does not require AI. Truth, parseability, versioning, and lifecycle linkage are part of the product contract.

### R4 / #64: target-specific tailoring and optional inference

**Status: next planned implementation phase.**

Deterministic first:

- [ ] select evidence by requirement relevance
- [ ] reorder experience/evidence for target relevance
- [ ] support legitimate vocabulary translation only when evidence supports it
- [ ] preserve unsupported requirements as visible gaps
- [ ] preserve source-to-statement links and version diffs

Optional inference:

- [ ] introduce a narrow provider-neutral `InferenceProvider`
- [ ] structured semantic requirement/evidence proposals
- [ ] evidence-bound phrasing proposals
- [ ] transferable-skill suggestions
- [ ] optional relevance/hiring-manager review
- [ ] schema-validate provider output
- [ ] explicit disclosure before remote transmission of career data
- [ ] deterministic fallback when no provider is configured

Do not introduce a generic agent framework, vector database, or provider-specific architecture for this phase unless a measured requirement demonstrates the need.

### R5 / #65: broader application lifecycle integration

**Status: planned.**

- [ ] evidence-backed cover letters/application materials
- [ ] exact submitted material history
- [ ] reminders/follow-up dates
- [ ] application contacts
- [ ] interview milestones
- [ ] interview preparation grounded in job + evidence + exact submitted resume
- [ ] reusable evidence-linked Career Stories
- [ ] offer/negotiation notes
- [ ] repeated skill/credential gap analysis
- [ ] versioned export/backup bundle with tested restore
- [ ] JSON Resume interoperability without canonical-schema drift
- [ ] OCR only through a separate evidence-backed decision
- [ ] DOCX export only if actual user demand justifies another output path

## Parallel Consumer Experience Track

The previous first-run and source-discovery bullets are now governed by the Universal User Stories program rather than existing as a disconnected parallel list.

- onboarding: #82
- target tracks/constraints: #83
- Career Evidence breadth: #84
- source discovery: #85
- opportunity assessment: #86
- cross-career validation: #87
- downstream story reconciliation: #88

## Source Reliability Track

- [ ] improve Workday reliability
- [ ] improve iCIMS reliability
- [ ] improve BambooHR reliability
- [ ] improve Oracle/Taleo reliability
- [ ] improve pagination/infinite-load handling where justified
- [ ] improve user-facing source failure diagnostics
- [ ] preserve fuller canonical job-description text where source capabilities allow it

Structured ATS adapters plus the constrained hidden Electron browser remain the preferred acquisition architecture.

## Optional Integration Seams

These are architecture seams, not dependency commitments:

- [ ] `InferenceProvider`
- [ ] `SourceDiscoveryProvider`
- [ ] `ResearchProvider`
- [ ] `OcrProvider`
- [ ] `CalendarProvider`
- [ ] additional `NotificationProvider` channels

Job Ranger should remain useful without any of them configured.

## Packaging and Release Track

- [x] current Windows and macOS v1.1.2 artifacts published
- [x] self-contained Windows SQLite runtime
- [x] deterministic macOS SQLite release smoke boundary
- [x] native Anydoc package behavior validated for Windows/macOS targets
- [ ] publish a release containing the accumulated R0-R3 product work
- [ ] repeat Windows packaging validation on that release candidate
- [ ] repeat macOS x64/arm64 packaging validation on the immutable release tag
- [ ] validate production Apple notarization whenever credentials are available
- [ ] decide whether Linux becomes a supported release target

## Explicit Non-Goals / Rejected Expansion

Do not add these without a specific evidence-backed product/governance decision:

- cloud account requirement
- multi-user/team job-search workspace
- recruiter-facing ATS functionality
- autonomous mass auto-apply
- opaque AI ranking that cannot explain its evidence
- generic agent framework/runtime
- generic workflow engine
- agent-memory platform
- managed browser platform as default scraping infrastructure
- vector database without measured need
- proprietary ATS scoring as product truth
- noncommercial/share-alike resume template code/assets inside the MIT product

These are not metaphysically banned forever. They simply do not get to arrive by architectural osmosis.

## Historical Plans

Earlier phase plans remain under `docs/` for provenance. See [`../README.md`](../README.md) for the documentation hierarchy and status rules.
