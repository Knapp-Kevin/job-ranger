# System State

**Snapshot date:** 2026-10-04  
**Published release:** v1.1.2  
**Selected release candidate:** v1.2.0  
**Default branch:** `main`  
**Release-preparation branch:** `release/v1.2.0-rc1`

This document is the factual repository/product snapshot. It intentionally separates what users can download today from what is implemented and being validated for v1.2.0.

## Status language

- **Shipped** — present in a published GitHub Release.
- **Release candidate** — version-selected candidate being validated for publication; not shipped yet.
- **Implemented on main** — merged into the default branch, but not necessarily present in the latest installer.
- **Candidate / next** — plausible follow-on work with some evidence behind it.
- **Deferred** — intentionally not active.
- **Historical** — provenance only.

## Published product: v1.1.2

The current published release includes:

- Electron desktop application for Windows x64 and macOS x64/arm64;
- SQLite-backed companies, sources, jobs, filters, settings, and scrape history;
- company/career-source monitoring with scheduled/background checks;
- structured Greenhouse, Lever, SmartRecruiters, and Ashby adapters;
- browser/generic best-effort acquisition paths for other career sites;
- occupation-agnostic Career Profile;
- hourly or annual compensation preference;
- deterministic profile-based fit guidance;
- Applications status tracking and notes;
- filters, desktop notifications, and tray behavior;
- self-contained Windows SQLite runtime.

No supported Linux installer is currently published.

## v1.2.0 release candidate

The release candidate contains the accumulated post-v1.1.2 product work plus the accepted QOR repository-hardening tranche. Until an immutable candidate is validated and a GitHub Release with the expected platform assets is published, these capabilities remain unshipped.

### Progressive onboarding and target tracks

The candidate supports:

- resume-first onboarding;
- no-resume direct evidence entry;
- goal-first onboarding;
- partial/resumable setup;
- multiple Target Tracks;
- required / preferred / target semantics;
- target-specific work mode, geography, schedule, employment arrangement, and compensation where represented by the current contract;
- backward-compatible migration from the previous blended Career Profile intent.

### Durable Career Profile, Applications, and Career Evidence

Career Profile and Applications live behind the Electron/SQLite boundary rather than renderer-local storage.

Career Evidence is the factual authority for career history. It supports:

- employment;
- skills;
- education;
- projects;
- achievements;
- credentials/licenses;
- publications and other nontraditional evidence;
- user-authored evidence;
- imported evidence proposals;
- provenance to source artifacts/extraction snapshots;
- confirm/edit/reject/merge/supersede workflows;
- structured credential status/jurisdiction/expiration fields;
- portfolio/work-sample references;
- evidence lineage.

Only user-confirmed or user-authored evidence may support factual application claims.

### Resume import

Candidate import paths:

- DOCX via `@firecrawl/anydoc@0.2.4`;
- text-bearing PDF via Anydoc;
- plain text;
- pasted text.

Import behavior includes:

- original artifact preservation before interpretation;
- SHA-256 hashing and duplicate detection;
- parser/version extraction snapshots;
- deterministic proposed Career Evidence;
- explicit encrypted/malformed/unsupported/resource-limit/parser-failure states;
- explicit OCR-required state for image-only documents;
- no silent hosted OCR or inference.

### Job requirements and evidence mapping

The candidate normalizes collected job text into durable requirements classified as:

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

Confirmed/user-authored evidence is required for direct or transferable factual support. Imported/unconfirmed evidence remains ambiguous.

### Explainable opportunity assessment

The old universal fit percentage is no longer the primary product truth in the candidate.

Assessment separates:

- eligibility;
- evidence coverage;
- career-track alignment;
- preference alignment;
- known blockers;
- unknown/missing information.

Unknown information remains unknown rather than being converted into fake precision.

### Source discovery and acquisition trust

Source discovery is implemented behind a provider-neutral boundary.

Current candidate behavior:

- accepts Target Track/search context;
- can return discovered opportunities and candidate employer sources;
- carries provider/provenance/support metadata;
- requires explicit user approval before a discovered source becomes monitored;
- deduplicates reusable structured employer boards;
- currently has partial provider coverage rather than universal market coverage.

Recognized structured and vendor/browser source families retain governed acquisition paths. The acquisition network policy rejects known unsafe loopback, link-local, private-network, and redirect targets during policy validation.

The QOR hardening review identified a remaining DNS-rebinding time-of-check/time-of-use gap: Node or Chromium may resolve a hostname again when the actual connection is established, so the address approved by policy is not yet connection-pinned. Issue #123 tracks the full transport-level fix.

For the v1.2.0 candidate, automated acquisition for **arbitrary generic career-site hostnames is disabled**. Unknown/generic career pages remain manual-review sources rather than entering the automated generic/browser path. Known provider/vendor domains retain their governed extraction paths. This narrows the practical attack surface while #123 remains open; it does not make the transport rebinding-proof.

### Deterministic resume creation and tailoring

The Resume workspace supports:

- `ResumeProjection` and evidence-linked `ResumeStatement` records;
- standard and compact Job Ranger-owned ATS-oriented templates;
- deterministic composition from confirmed Career Evidence;
- job-targeted evidence selection;
- target-specific deterministic tailoring;
- unsupported gaps preserved as gaps;
- source/evidence links and version diffs;
- Truth Gate before export;
- sandboxed Chromium PDF rendering;
- PDF reparse through Anydoc;
- Parseability Gate;
- versioned immutable resume artifacts;
- exact Application-to-artifact linkage.

Remote inference is not required.

### Application lifecycle

Applications support durable:

- status and notes;
- exact submitted resume history;
- contacts;
- milestones/interviews;
- follow-up events;
- reminders;
- target-track association;
- offer/negotiation state;
- linked application materials.

### Interview preparation

Interview prep is deterministic and grounded in:

- the tracked job;
- current confirmed Career Evidence;
- requirement/evidence mappings;
- the exact submitted resume artifact.

It distinguishes:

- evidence exactly submitted;
- current confirmed evidence not submitted;
- current evidence that superseded an earlier submitted claim;
- unsupported gaps;
- missing context.

### Career Stories

Career Stories are durable, evidence-linked reusable narratives for interviews/application preparation. They retain evidence authority relationships so later evidence corrections can make stale stories visible.

### Application materials

The candidate supports versioned evidence-grounded application-material projections, including deterministic cover-letter preparation.

Historical materials preserve the wording/evidence snapshot used at creation time. Later evidence edits, rejection, merge, or supersession mark old drafts stale rather than silently rewriting history.

### Search Insights

Search Insights derives deterministic observations from saved state, including:

- applications grouped by Target Track/source/status;
- interview/offer patterns;
- recurring unsupported requirements;
- evidence-based strategy signals above minimum sample thresholds.

Observed correlation is not presented as causal hiring truth, and raw application count is not treated as the product's success metric.

### Backup and restore

The candidate provides:

- versioned portable backup bundles;
- SQLite snapshots;
- managed artifact inclusion;
- content/integrity hashes;
- tamper/corruption validation;
- staged restore;
- managed-path rebasing when restoring to a different data root;
- preservation of the old live data as rollback candidate until restored state is validated.

### JSON Resume interoperability

JSON Resume import/export is implemented as an adapter.

- import creates imported/proposed evidence rather than factual authority;
- export uses current confirmed/user-authored evidence;
- unsupported Job Ranger-specific provenance stays canonical in Job Ranger rather than being forced into standard fields.

JSON Resume is not the canonical data model.

### QOR hardening tranche

The accepted repository-hardening tranche includes:

- bounded privileged numeric IPC/settings inputs;
- exact-host-or-subdomain source-vendor classification rather than deceptive substring matches;
- managed artifact path confinement for reveal-in-folder actions;
- record-shape validation that rejects arrays where object payloads are required;
- removal of duplicate checked-in compiled validator implementations;
- removal/ignore rules for generated and temporary repository residue;
- repository-health coverage for real salary-parser, scrape-guard, tray-policy, and QOR regression tests;
- the generic-site acquisition restriction described above as the v1.2.0 mitigation for #123.

## Current runtime architecture

```text
React renderer
  onboarding / jobs / applications / search insights
  career profile / evidence / stories / target tracks / resume
  companies / filters / settings
          │
          ▼ typed preload / IPC
Electron main process
  JobScoutBackend
  CareerBackend + CareerEvidenceRepository
  RequirementBackend + mapper
  Target Track validation/persistence
  SourceDiscoveryProvider + acquisition network policy
  ResumeService + tailoring
  ApplicationLifecycleBackend
  InterviewPrepBackend
  CareerStoryBackend
  ApplicationMaterialsBackend
  ApplicationInsightsBackend
  BackupService
  JsonResumeAdapter
          │
          ▼
      SQLite + managed local artifacts
```

The renderer does not receive direct SQLite, parser, arbitrary filesystem, or general Node.js authority.

## Build/runtime authority

`electron/src/**` is the only checked-in privileged implementation authority.

```text
electron/src
    ↓ TypeScript compile
 electron-runtime/
    ↓
 dev / smoke tests / Electron E2E / Electron Builder / packaged app
```

`electron-runtime/**` is generated and ignored. Compatibility shims exist only for older test/runtime entry points and forward into the generated runtime.

## Security boundaries

Candidate main-process/renderer protections include:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `webSecurity: true`;
- primary renderer sandboxing;
- typed preload APIs;
- renderer Content Security Policy;
- validated external navigation;
- dedicated acquisition network policy;
- arbitrary generic-host acquisition disabled pending #123;
- restricted hidden browser surfaces;
- isolated resume render window with JavaScript disabled and remote resources denied;
- managed artifact storage/path confinement;
- file/type/size validation for imported career documents;
- no silent hosted OCR/inference.

The acquisition policy is not connection-pinned and must not be described as DNS-rebinding-proof. See `SECURITY.md` and #123.

Any weakening of these boundaries is a material governance change.

## Runtime/toolchain baseline

The v1.2.0 release branch records:

- Node.js `>=22.12.0`;
- Electron `44.4.5`;
- TypeScript `7.0.2`;
- Vite `8.x`;
- React `19.3.0`;
- Electron Builder `26.x`;
- `@firecrawl/anydoc` `0.2.4`;
- `package.json` version `1.2.0`.

`package-lock.json` still records the previous root package version and must be reconciled before the candidate can merge/tag.

## Validation state

The repository has automated unit/backend/Electron coverage across:

- acquisition network policy;
- QOR hardening regressions;
- target-track semantics;
- credentials and evidence extensions;
- career persistence and user-authored evidence;
- source discovery;
- opportunity assessment;
- universal career fixtures and military transition;
- application lifecycle and offers/insights;
- Career Stories;
- application materials;
- interview prep;
- resume import, lifecycle, tailoring, and provenance;
- backup/restore;
- JSON Resume interoperability.

Fresh hosted CI passed on the initial v1.2.0 candidate head, including `npm ci`, the high-severity dependency gate, and repository health (typecheck, build, and test). The candidate changed afterward for the #123 mitigation and documentation reconciliation, so fresh validation on the final frozen head is still required. Electron E2E must also be green on that final head.

The project intentionally preserves GitHub Actions budget. Documentation/remediation and some release-preparation validation may be performed manually and must record exactly what was executed.

## Completed programs

### Career Evidence and Resume Intelligence / #59

- R0 — complete;
- R1 — complete;
- R2 — complete;
- R3 — complete;
- R4 deterministic tailoring — complete;
- R4 optional remote inference — deliberately deferred, not a completion blocker;
- R5 broader lifecycle / application materials / interview / portability — complete.

### Universal User Stories / #81

US-0 through US-30 have been reconciled as satisfied by the current product contract, with narrower capabilities explicitly deferred where validation did not justify core implementation.

## Known product/release gaps

### Release gates

- reconcile the `package-lock.json` root package version with staged `package.json` v1.2.0 metadata;
- obtain fresh final-head repository-health, dependency-audit, unit, and Electron E2E evidence;
- explicitly disposition the residual #123 DNS-rebinding risk for publication after validating the generic-host mitigation;
- exercise representative v1.1.2 → v1.2.0 migration plus backup/restore behavior;
- validate Windows NSIS x64 and macOS x64/arm64 packages from the immutable candidate;
- record signing/notarization evidence where credentials are available, or state the limitation explicitly.

### Needed follow-on quality work

- preserve fuller/canonical job-description/source snapshots where source capabilities permit it (#117);
- improve user-visible reliability diagnostics for dynamic/best-effort source families (#118);
- complete connection-level anti-rebinding architecture rather than relying permanently on the v1.2.0 generic-host restriction (#123).

### Candidate

- broader opportunity discovery providers, especially government/niche contexts;
- faster job capture from arbitrary browsing;
- reusable application-question answers;
- user-controlled application form assistance without auto-submit;
- Career Ops company targeting and relationship paths beyond application-scoped contacts (#121);
- calendar mirroring;
- mock-interview practice/feedback;
- richer organization/tags where real use shows need.

### Deferred

- remote inference provider;
- OCR for image-only resumes;
- DOCX resume export;
- federal-resume/academic-CV specialized artifact types until demand is validated;
- universal travel/relocation/sponsorship fields without broader validation;
- cloud sync;
- Linux packaged distribution.

### Rejected / non-goal under current governance

- autonomous mass auto-apply;
- opaque hiring-probability/ATS scoring presented as truth;
- recruiter-facing ATS/team workspace;
- generic agent framework/vector database/workflow engine without a measured requirement.

See `docs/PRODUCT_GAP_REVIEW.md` for rationale.

## Release boundary

The latest published installers are still v1.1.2 and do **not** include most v1.2.0 candidate capabilities.

Before publication:

- documentation must match the frozen candidate;
- migration/backup upgrade behavior from v1.1.2 must be exercised;
- the residual security posture must be explicitly dispositioned;
- Windows package validation must be repeated on the immutable tag;
- macOS x64/arm64 packaging must be repeated on the immutable tag;
- notarization evidence must be recorded when credentials are available;
- release notes/download links must be updated only after assets exist.

See `docs/RELEASE_READINESS.md` and `docs/validation/RELEASE_CANDIDATE_V1.2.0.md`.

## Current sources of truth

- `README.md` — public overview and published-vs-candidate boundary;
- `HELP.md` — user workflow and troubleshooting;
- `CHANGELOG.md` — published history plus release-candidate/unreleased delta;
- `docs/CONCEPT.md` — product purpose and principles;
- `docs/SYSTEM_STATE.md` — factual current snapshot;
- `docs/ARCHITECTURE_PLAN.md` — current architecture and accepted evolution;
- `docs/planning/PLAN.md` — actual next work;
- `docs/RELEASE_READINESS.md` — release-blocking contract;
- `docs/PRODUCT_GAP_REVIEW.md` — capability-gap dispositions;
- `docs/design/UNIVERSAL_USER_STORIES.md` — normative user-story contract;
- `docs/validation/RELEASE_CANDIDATE_V1.2.0.md` — candidate-specific evidence/gates;
- `GOVERNANCE.md`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md` — governance/security/attribution.

See `docs/README.md` for the documentation hierarchy.
