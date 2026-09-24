# Job Ranger Roadmap

**Current as of:** 2026-09-24

This file is the active roadmap. Older phase/remediation plans under `docs/` are historical implementation records and no longer define current status.

## North Star

Job Ranger is a job search companion.

The product should help the user:

1. find opportunities;
2. understand which ones are worth attention;
3. prepare factual application materials;
4. track what happened;
5. prepare for the next step;
6. learn from the search without turning the process into another job.

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

Career Profile and Applications are functional but still renderer-local. Moving them to the desktop backend/SQLite repository is the next persistence-hardening step and the prerequisite for a coherent Career Evidence domain.

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
- [x] occupation-agnostic role targeting
- [x] current / adjacent / reasonable stretch role framing
- [x] hourly or annual minimum-pay preferences
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

- [x] Windows v1.1.2 self-contained installer published
- [x] macOS x64 v1.1.2 DMG/ZIP published
- [x] macOS arm64 v1.1.2 DMG/ZIP published
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

The coordinated runtime/toolchain migration tracked under issue #38 is complete. v1.1.1 established the corrected self-contained cross-platform release boundary; v1.1.2 is the current published release.

- [x] supported Electron target selected and adopted
- [x] Node baseline raised deliberately
- [x] ESM/CJS notarization boundary reconciled
- [x] Vite/plugin stack migrated together
- [x] Electron ecosystem tooling modernized
- [x] TypeScript 7 adopted
- [x] clean `npm ci`
- [x] `repo:health`
- [x] Electron E2E
- [x] Windows packaging built and smoke-tested on a Windows runner
- [x] Windows packaged runtime includes and resolves bundled SQLite without host installation
- [x] macOS x64/arm64 packaging validated from immutable release tags
- [x] current Windows and macOS artifact sets verified on the v1.1.2 GitHub Release

The hosted macOS runner previously exposed an Android SDK `sqlite3` earlier on `PATH` than the system binary. The durable release workflow pins macOS release smoke tests to `/usr/bin/sqlite3`.

Future major toolchain upgrades should follow the same migration discipline rather than arrive as disconnected bot merges.

## Next Product Program: Career Evidence and Resume Intelligence

The resume/import phase is no longer framed as a document-only feature.

The accepted architecture is:

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

Research and functional design:

- [`../research/RESUME_INTELLIGENCE_QOR.md`](../research/RESUME_INTELLIGENCE_QOR.md)
- [`../research/RESUME_INTELLIGENCE_CATALOG_HARVEST.md`](../research/RESUME_INTELLIGENCE_CATALOG_HARVEST.md)
- [`../research/JOB_RANGER_CAPABILITY_CATALOG_RECONCILIATION.md`](../research/JOB_RANGER_CAPABILITY_CATALOG_RECONCILIATION.md)
- [`../design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md`](../design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md)

The implementation should proceed in the following order.

### R0. Durable Career Intelligence + contract freeze

Goal: establish the persistence and domain boundary before importing documents into a second temporary store.

- [ ] move Career Profile persistence into SQLite/backend
- [ ] move Applications persistence into SQLite/backend
- [ ] migrate existing renderer-local user data where practical
- [ ] freeze `SourceArtifact` / `CandidateEvidence` / provenance contracts
- [ ] freeze `JobRequirement` / requirement-evidence mapping contracts
- [ ] freeze resume projection/artifact contracts
- [ ] define SQLite migrations
- [ ] define managed artifact-directory layout and hashing rules
- [ ] define inference/privacy disclosure boundary
- [ ] create occupation-diverse synthetic benchmark corpus
- [ ] add deterministic persistence/scorer regression coverage

### R1. Resume import and Career Evidence review

Goal: import existing career material without treating parser output as truth.

- [ ] run bounded parser bake-off on DOCX/text-PDF fixtures
- [ ] evaluate `firecrawl/anydoc` as the preferred default parser candidate
- [ ] compare against MarkItDown, Docling, and PDF-specialized benchmark paths where useful
- [ ] adopt only the best-fit parser, not a redundant parser stack
- [ ] preserve original source artifact before extraction
- [ ] record source hash, detected format, parser identity/version, warnings, and extraction snapshot
- [ ] normalize proposed Career Evidence with field/evidence confidence
- [ ] add human confirm/edit/reject/merge workflow
- [ ] surface explicit `Needs OCR`, encrypted, malformed, unsupported, and resource-limit states
- [ ] keep hosted OCR disabled by default
- [ ] derive confirmed skills/credentials/history into Career Profile surfaces without creating a second factual store

Initial supported input should focus on:

- DOCX;
- text-bearing PDF;
- plain/pasted text.

Scanned/image-only OCR is a separate later capability.

### R2. Job requirement ↔ evidence mapping

Goal: explain fit and gaps from durable evidence rather than only profile keywords.

- [ ] normalize explicit must-have/preferred/responsibility/credential/logistics requirements
- [ ] classify requirement coverage as direct / transferable / ambiguous / gap
- [ ] require confirmation for ambiguous inferred mappings
- [ ] keep unsupported requirements visible as gaps
- [ ] expose evidence-backed requirement coverage in Find Jobs
- [ ] add `Prepare resume` path from a tracked/reviewed job
- [ ] preserve deterministic behavior when inference is absent

### R3. Deterministic resume creation and artifact lifecycle

Goal: a user can build and export a truthful usable resume without configuring AI.

- [ ] implement structured `ResumeProjection` / `ResumeStatement` domain
- [ ] add Job Ranger-owned ATS-safe standard template
- [ ] add ATS-safe compact template
- [ ] add conservative polished template only when it remains parseable
- [ ] render through the existing Electron/Chromium runtime before adding a second renderer
- [ ] implement blocking Truth Gate
- [ ] implement critical/advisory Parseability Gate
- [ ] re-parse generated PDF with the selected parser where viable
- [ ] version exported artifacts with hashes/page counts/audit results
- [ ] compare versions/diffs
- [ ] link the exact submitted resume artifact to Applications

The milestone is not complete merely because a PDF can be emitted.

### R4. Target-specific tailoring and optional inference

Goal: improve language/relevance while retaining evidence authority.

Deterministic first:

- [ ] select evidence by requirement relevance
- [ ] reorder experience/evidence appropriately
- [ ] support legitimate vocabulary translation when source evidence supports the target term
- [ ] show gaps before finalization
- [ ] preserve source-to-statement links and diffs

Optional inference:

- [ ] thin provider boundary, not a general agent framework
- [ ] semantic requirement/evidence mapping proposals
- [ ] evidence-bound resume phrasing proposals
- [ ] transferable-skill suggestions
- [ ] optional relevance/hiring-manager review
- [ ] schema-validate structured inference output
- [ ] explicit user disclosure before remote providers receive career data
- [ ] no silent resume/profile transmission

### R5. Application-material and lifecycle integration

Goal: use the same evidence model across the rest of the search.

- [ ] cover-letter/application-material projections from the same evidence
- [ ] resume/application artifact history
- [ ] reminders/follow-up dates
- [ ] contacts
- [ ] interview milestones
- [ ] evidence-backed interview preparation using the exact resume sent
- [ ] reusable Career Story bank linked to evidence
- [ ] offer details/negotiation notes
- [ ] repeated skill/credential gap analysis across applications
- [ ] versioned export/backup bundle
- [ ] JSON Resume import/export interoperability, without making it canonical storage
- [ ] evaluate OCR only as a separately justified capability
- [ ] evaluate DOCX output only if user demand justifies another renderer/export path

## Consumer Experience Track

### First-run experience

Goal: a new user should launch Job Ranger and immediately understand what information is useful.

- [ ] route first launch into guided Career Profile/evidence setup when no profile exists
- [ ] allow resume import or guided experience entry
- [ ] simplify role entry without assuming an occupation
- [ ] clarify location and commute radius behavior
- [ ] clarify pay floor/preferences
- [ ] improve certification/license capture
- [ ] suggest adjacent role titles without fabricating qualification
- [ ] no requirement for GitHub, YAML, terminal commands, or provider configuration

### Consumer-friendly source discovery

Goal: users should not need to know employer ATS URLs in advance.

- [ ] define native `SourceDiscoveryProvider` contract
- [ ] search/discover by role + geography
- [ ] resolve relevant employer/source-page candidates internally
- [ ] require user approval before discovered sources become monitored companies
- [ ] keep source discovery separate from extraction adapters
- [ ] preserve trust/support labels and discovery evidence
- [ ] avoid a brittle one-off employer catalog as the architecture
- [ ] add external search only behind an optional provider seam if measured benefit justifies it

The broader Technical Capability Catalog review did **not** identify a browser/search platform that merits becoming Job Ranger's core discovery runtime today.

## Source Reliability Track

Continue improving source support based on evidence from real sites:

- [ ] Workday reliability
- [ ] iCIMS reliability
- [ ] BambooHR reliability
- [ ] Oracle/Taleo reliability
- [ ] pagination/infinite-load handling where appropriate
- [ ] clearer user-facing failure diagnostics

Current structured ATS adapters and hidden sandboxed Electron browser fallback remain the preferred architecture. Do not replace them with a managed browser/search platform merely because such platforms exist.

Do not promote a source from best-effort to supported merely because one example happened to work.

## Optional Integration Seams

These are architecture seams, not dependency commitments:

- [ ] `InferenceProvider`
- [ ] `SourceDiscoveryProvider`
- [ ] `ResearchProvider`
- [ ] `OcrProvider`
- [ ] `CalendarProvider`
- [ ] additional `NotificationProvider` channels

Job Ranger should remain fully useful without any of them configured.

## Packaging Track

- [x] complete Node/Electron/Vite/TypeScript modernization
- [x] make Windows packaging self-contained for SQLite
- [x] pin macOS release smoke tests to the system SQLite binary
- [x] publish current v1.1.2 Windows/macOS artifacts
- [ ] maintain Windows release confidence on future releases
- [ ] maintain macOS x64/arm64 release confidence on future releases
- [ ] validate notarization with production Apple credentials whenever those credentials are available
- [ ] validate packaging impact before adopting any native resume/document parser dependency
- [ ] decide whether Linux becomes an explicitly supported release target

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

These are not banned forever. They simply do not get to arrive by architectural osmosis.

## Historical Plans

Earlier phase plans remain under `docs/` for provenance. See [`../README.md`](../README.md) for the documentation index and status hierarchy.
