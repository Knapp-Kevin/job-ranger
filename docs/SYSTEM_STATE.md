# System State

**Snapshot date:** 2026-10-04  
**Published release:** v1.1.2  
**Selected next release:** v1.2.0  
**Validated packaged candidate:** v1.2.0-rc.3  
**Candidate commit:** `e25c61c0be21dd00bc80a0880d2a770660c283bd`  
**Release-preparation branch:** `release/v1.2.0-rc1`

This document is the factual product/repository snapshot. It intentionally separates the published v1.1.2 installers from the much broader v1.2.0 candidate.

## Status language

- **Shipped** — present in a stable published GitHub Release.
- **Packaged candidate** — built from an immutable prerelease tag and validated as a release artifact, but not yet promoted as the stable public release.
- **Implemented** — merged into the release/default-branch lineage, but not necessarily present in the latest stable installer.
- **Candidate / next** — plausible follow-on work, not a product commitment.
- **Deferred** — intentionally not active.
- **Historical** — provenance only.

## Published product: v1.1.2

The latest stable public installers remain v1.1.2 for Windows x64 and macOS x64/arm64.

v1.1.2 includes the earlier desktop monitoring product, Career Profile, deterministic fit guidance, Applications tracking, filters, notifications, source monitoring, and the v1.1 Windows/macOS packaging fixes.

No supported Linux installer is published.

## v1.2.0 candidate

v1.2.0 is a substantial backward-compatible expansion of Job Ranger into a local-first Career Ops workspace.

### Career direction and onboarding

Implemented:

- progressive resume-first, no-resume, and goal-first onboarding;
- partial/resumable setup;
- multiple Target Tracks;
- required / preferred / target semantics;
- target-specific role, geography, work-mode, schedule, employment-arrangement, and compensation intent where represented by the current contract;
- backward-compatible migration from the previous blended Career Profile intent.

### Career Evidence

Career Evidence is the factual authority for career history.

Implemented:

- employment, skills, education, projects, achievements, credentials/licenses, publications, volunteer/nontraditional work, and portfolio/work-sample references;
- direct user authoring;
- imported evidence proposals;
- provenance to source artifacts and extraction snapshots;
- confirm/edit/reject/merge/supersede workflows;
- structured credential status, jurisdiction, expiration, and lineage;
- factual authority rules that prevent unconfirmed imports from becoming application claims.

### Resume import

Implemented import paths:

- DOCX;
- text-bearing PDF;
- plain text;
- pasted text.

Import preserves the source artifact before interpretation, records SHA-256/parser metadata, detects duplicates, and surfaces explicit encrypted/malformed/unsupported/resource-limit/parser-failure/OCR-required states.

Image-only/scanned OCR remains deferred rather than silently invoking a hosted service.

### Job source truth and requirements

#117 is complete.

The candidate now preserves durable source snapshots for collected job content, including:

- source URL;
- retrieval time;
- content hash;
- extraction/version metadata;
- completeness state;
- changed-content history and deduplication.

Requirement analysis reasons over preserved source text rather than relying on the legacy short description snippet. Requirement/evidence mappings retain source linkage so later application/interview context can identify the exact text Job Ranger used.

### Source reliability diagnostics

#118 is complete.

Scrape/acquisition outcomes distinguish materially different states including:

- success;
- success with zero jobs;
- cooldown/circuit states;
- unsupported source;
- browser unavailable;
- network-policy rejection;
- access denied;
- rate limiting;
- timeout/retrieval failure;
- extraction failure;
- parser failure;
- unclassified failure.

User-facing explanations remain separate from raw technical diagnostics.

### Opportunity assessment

The old universal fit percentage is no longer the primary product truth.

Assessment separates:

- eligibility;
- evidence coverage;
- career-track alignment;
- preference alignment;
- blockers;
- unknown/missing information.

Unknown information remains unknown instead of becoming fake precision.

### Resume creation and tailoring

Implemented:

- deterministic evidence-backed resume projection;
- standard and compact ATS-oriented templates;
- job-targeted evidence selection;
- deterministic target-specific tailoring;
- factual statement → Career Evidence linkage;
- Truth Gate;
- sandboxed Chromium PDF rendering;
- PDF reparse and Parseability Gate;
- immutable/versioned artifacts and diffs;
- exact application-to-submitted-artifact linkage.

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

### Interview preparation and Career Stories

Interview preparation is grounded in the tracked job, current Career Evidence, requirement/evidence mappings, and the exact submitted resume artifact.

It distinguishes submitted evidence, later-confirmed evidence, superseded/corrected evidence, and genuine gaps.

Career Stories are reusable evidence-linked narratives whose factual dependencies remain visible when evidence changes.

### Application materials and Search Insights

Implemented:

- versioned evidence-grounded application-material projections;
- stale-material detection when supporting evidence changes;
- applications grouped by Target Track/source/status;
- recurring unsupported requirement analysis;
- observed interview/offer patterns;
- bounded strategy signals above minimum sample thresholds.

Observed correlation is not represented as causal hiring truth, and raw application count is not a success metric.

### Backup and portability

Implemented:

- versioned portable backup bundles;
- SQLite snapshots;
- managed-artifact inclusion and hashes;
- tamper/corruption validation;
- staged restore;
- managed-path rebasing when restoring to another data root;
- preservation of the old live data as rollback candidate until restore validation;
- JSON Resume import/export as a bounded interoperability adapter.

## Acquisition security

#123 is complete.

The v1.2.0 acquisition boundary now provides connection-level anti-rebinding protection:

- URL policy rejects unsafe loopback, private, link-local, reserved, and otherwise disallowed targets;
- hostname policy resolution returns the exact approved public address set;
- direct HTTP/HTTPS sockets connect only to those approved addresses without a second DNS lookup;
- HTTP Host, TLS SNI, and certificate verification remain bound to the original hostname;
- redirects are independently resolved, approved, and pinned per hop;
- discovery uses the same pinned transport;
- isolated Electron scraper HTTP/HTTPS document and subresource traffic is routed through the governed/pinned transport;
- deterministic regression coverage proves a hostile later DNS answer cannot redirect the direct transport to a private/local address.

Arbitrary generic career-site hostnames remain manual-review/non-runnable in v1.2.0. Known provider/vendor paths retain governed acquisition.

Future acquisition changes must preserve connection-level pinning rather than reverting to preflight-only DNS checks.

## Distribution trust

Repository-side #125 work is implemented; actual signed public evidence is still external and tracked by #130.

### Stable public tags

Exact stable tags matching `vMAJOR.MINOR.PATCH` fail closed unless platform trust configuration is present and verification succeeds.

Windows public path:

- Microsoft Azure Artifact Signing;
- Authenticode verification of packaged executable and installer;
- trust evidence emitted as `windows-signing.json`.

macOS public path:

- Developer ID Application signing;
- hardened runtime;
- Apple notarization and stapling;
- `codesign`, Gatekeeper assessment, and stapler validation;
- trust evidence emitted as `macos-signing.txt`.

### Prerelease/tester path

Unsigned prerelease artifacts are explicitly tester-only.

Every platform package build emits SHA-256 identity evidence after packaging from the exact uploaded files:

- `windows-SHA256SUMS.txt`;
- `windows-release-manifest.json`;
- `macos-SHA256SUMS.txt`;
- `macos-release-manifest.json`.

Windows Smart App Control may make an unsigned tester build non-runnable without a safe per-app override. Job Ranger does not recommend disabling Smart App Control, SmartScreen, or Defender.

macOS tester guidance uses Apple's bounded Privacy & Security → Open Anyway flow when macOS offers it. Job Ranger does not recommend disabling Gatekeeper globally.

## Validated packaged candidate: v1.2.0-rc.3

Immutable tag:

`v1.2.0-rc.3` → `e25c61c0be21dd00bc80a0880d2a770660c283bd`

Hosted release run `37239803933` succeeded on both Windows and macOS.

Verified Windows prerelease assets:

- `Job.Ranger-v1.2.0-windows-x64.exe`;
- `.exe.blockmap`;
- `latest.yml`;
- `windows-signing.json`;
- `windows-SHA256SUMS.txt`;
- `windows-release-manifest.json`.

Verified macOS prerelease assets:

- arm64 DMG;
- arm64 ZIP;
- x64 DMG;
- x64 ZIP;
- `macos-signing.txt`;
- `macos-SHA256SUMS.txt`;
- `macos-release-manifest.json`.

The release is correctly marked as a GitHub prerelease. v1.1.2 remains the stable release.

## Upgrade validation

The representative v1.1.2 → v1.2.0 upgrade fixture proves:

- representative legacy SQLite company/job/filter/settings state survives current migrations;
- renderer-local v1.1.2 Career Profile and Application state migrate into the durable model;
- migration is idempotent;
- the legacy Career Profile creates the expected migration-bridge Target Track;
- a byte-identical pre-upgrade database snapshot is preserved;
- post-upgrade backup validates;
- upgraded state restores into another data root with managed paths rebased.

## Repository validation

The release lineage has passed clean install, dependency/security gating, explicit unit suites, typecheck, production build, repository smoke suites, and Electron E2E after the major implementation/hardening tranches.

Dedicated regressions cover:

- acquisition network policy and DNS rebinding;
- source truth/diagnostics;
- QOR hardening;
- target tracks and credentials;
- Career Evidence and persistence;
- source discovery;
- opportunity assessment;
- cross-career fixtures;
- application lifecycle/offers/insights;
- Career Stories and application materials;
- interview preparation;
- resume import/lifecycle/tailoring/provenance;
- backup/restore;
- JSON Resume;
- distribution trust configuration;
- release manifest/checksum generation;
- optional macOS signing-environment normalization.

## Product direction

Job Ranger is a quality-over-quantity Career Ops product.

Preferred progression:

**Person → Career Direction → Companies → People → Opportunities → Applications**

Career relationship/company-targeting design under #121 is complete as a bounded candidate model, but those broader relationship-path capabilities are not claimed as implemented in v1.2.0.

## Explicitly deferred / not in v1.2.0

- remote inference provider;
- OCR for image-only resumes;
- DOCX resume export;
- cloud sync;
- specialized federal-resume / academic-CV projections without demonstrated demand;
- autonomous mass auto-apply;
- recruiter-facing ATS/team workspace;
- Linux packaged distribution (evaluation #129 closed as deferred until demand);
- Microsoft Store AppX/MSIX packaging (evaluation #133 closed as a valid post-release candidate, not current scope).

## Remaining stable-release gates

Repository implementation and packaged prerelease generation are no longer blockers.

Still required:

1. packaged consumer smoke against rc.3, including a materially non-software career workflow;
2. actual Azure Artifact Signing credentials and signed Windows evidence;
3. clean supported Windows 11 install/launch evidence;
4. actual Apple Developer ID credentials and signed/notarized/stapled macOS evidence;
5. clean supported macOS Gatekeeper launch evidence;
6. immutable stable `v1.2.0` tag/build from the approved lineage;
7. final stable asset inventory/download spot-check;
8. README and shipped-status transition from v1.1.2 to v1.2.0 only after stable assets exist.

The connected Desktop Commander runner is currently offline, so packaged local consumer smoke is not being claimed.

## Current sources of truth

- `README.md` — public overview and published-vs-candidate boundary;
- `HELP.md` — user workflow/troubleshooting;
- `CHANGELOG.md` — release history and candidate delta;
- `docs/CONCEPT.md` — product purpose/principles;
- `docs/SYSTEM_STATE.md` — this factual snapshot;
- `docs/ARCHITECTURE_PLAN.md` — architecture;
- `docs/RELEASE_READINESS.md` — release-blocking contract;
- `docs/DISTRIBUTION_TRUST.md` — platform trust contract;
- `docs/TESTER_INSTALLATION.md` — bounded prerelease installation guidance;
- `docs/PRODUCT_GAP_REVIEW.md` — candidate/deferred/non-goal dispositions;
- `docs/validation/RELEASE_CANDIDATE_V1.2.0.md` — candidate-specific evidence;
- `GOVERNANCE.md`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md` — governance/security/attribution.
