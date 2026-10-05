# System State

**Snapshot date:** 2026-10-05
**Published release:** v1.2.0
**Current development line:** post-v1.2.0
**Shipped release lineage:** v1.2.0 promoted from v1.2.0-rc.5
**Release commit:** `71f9b790a1f456321aee2c783f39f4a6784b83a9`

This document is the factual product/repository snapshot. It separates the published v1.2.0 release from newer work on the post-v1.2.0 development line.

## Status language

- **Shipped** — present in a stable published GitHub Release.
- **Packaged candidate** — built from an immutable prerelease tag and validated as a release artifact, but not yet promoted as the stable public release.
- **Implemented** — merged into `main`, but not necessarily present in the latest stable installer.
- **Candidate / next** — plausible follow-on work, not a product commitment.
- **Deferred** — intentionally not active.
- **Historical** — provenance only.

## Published product: v1.2.0

v1.2.0 is the latest stable public release: Windows x64 (NSIS) and macOS x64/arm64 installers, published unsigned/unnotarized under an explicit owner-approved exception. Earlier releases (v1.1.2 and before) are historical.

No supported Linux installer is published.

## Post-v1.2.0 development line (implemented, not released)

The accepted distribution architecture ([`design/DISTRIBUTION_ARCHITECTURE.md`](./design/DISTRIBUTION_ARCHITECTURE.md)) is implemented (PR #142). None of this is shipped: there is no release tag, Store listing, or production web origin yet.

### Shared core and runtimes

- The Job Ranger application core (repositories, migrations, domain services, IPC channel table, boundary validators, Truth Gate, Parseability Gate, backup/archive) runs unchanged in two runtimes. Runtime infrastructure comes from explicit adapters (`src/pwa/adapter-map.ts`), enforced by a contract test.
- **Web/PWA runtime** (implemented, not deployed): React app + dedicated runtime worker. Persistence is SQLite WASM written to OPFS as atomic snapshots, with an exclusive Web Lock so only one writer exists.
  - Browser DOCX/PDF parsing and a deterministic pdf-lib ATS PDF writer.
  - Strict CSP with Trusted Types and an explicit acquisition-origin allowlist.
  - SHA-256-verified service-worker shell with user-confirmed updates and repair; offline use after the first visit.
  - Details and the capability parity matrix: [`design/PWA_RUNTIME.md`](./design/PWA_RUNTIME.md).
- **Microsoft Store package** (implemented; package validation in CI; certification pending): electron-builder v26 `appx` target. Partner Center identity comes from repository variables. Capabilities are only `runFullTrust` + `internetClient`.
  - The Store build uses an isolated data root, maps AppX virtualization paths for Explorer, offers an explicit read-only import of historical NSIS data, and contains no app-managed updater.
  - An in-package smoke runs the real main process.
  - Details: [`design/MICROSOFT_STORE_PACKAGING.md`](./design/MICROSOFT_STORE_PACKAGING.md).
- **Portable `.jobranger` archive**: single-file, versioned, CRC-32 and SHA-256 validated. Used for Electron ↔ PWA ↔ PWA moves. Restoring v1.2.0 directory backups (via their `manifest.json`) remains supported in the desktop app.

### Shared-core hardening found during implementation

- The Greenhouse Job Board API returns entity-escaped HTML. Requirement extraction previously saw one undifferentiated blob; it is now unescaped (`greenhouse-api-v2` extraction version).
- Backup validation now compares against every migration this build knows (core + feature registry), not only the migrations the live database has applied.
- Schema downgrade guard: data upgraded by a newer schema is refused with an explanation instead of being opened by older code. This applies to both runtimes and to web rollbacks.
- The remote Google Fonts `@import` was removed. The Electron CSP already blocked it; the UI uses system font fallbacks.

### Validation on this line

- `npm test` adds the archive smoke, Store config test, runtime-adapter contract, PWA adapter tests, and the 18 shared-core suites re-run on the SQLite WASM engine.
- Electron E2E: 31 tests.
- PWA browser suite: 11 tests (Chromium) covering the healthcare Career Ops workflow, Electron↔PWA portability, rejected backups, offline shell, browser restart, tab lock, verified/rejected updates, and quota failure.
- Web parser: 9/9 on the shared resume-parser benchmark corpus.
- `windows-store-package` workflow: AppX build, manifest verification, install, and in-package smoke on Windows (including native DOCX import).
- Evidence record: [`validation/DISTRIBUTION_IMPLEMENTATION_2026-10-05.md`](./validation/DISTRIBUTION_IMPLEMENTATION_2026-10-05.md).

### Known gaps on this line

- No production web origin; Firefox and Safari plus real-device installability are not yet validated.
- Microsoft Store identity, submission, and certification are external and pending.
- The web runtime cannot monitor career sites that need a full browser (Workday, iCIMS, etc.) or run scheduled checks while closed. These are documented platform limitations; the Windows app covers them.
- The web PDF writer supports Latin-script (Windows-1252) text only and fails explicitly otherwise.
- Pre-existing (both runtimes): notification settings exist, but job notifications are not wired to scrape completion.

## v1.2.0 shipped capabilities

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
- factual-authority rules that prevent unconfirmed imports from becoming application claims.

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

Job Ranger preserves durable source snapshots for collected job content, including:

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

The v1.2.0 acquisition boundary provides connection-level anti-rebinding protection:

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

> **Forward change (post-v1.2.0, implemented on the development line):**
> - Azure Artifact Signing is opt-in (`vars.JOB_RANGER_REQUIRE_WINDOWS_SIGNING`). An unsigned direct installer is labelled tester-only in its release manifest.
> - Native macOS builds run only on manual dispatch.
> - Each Store package and web build gets a release manifest and a GitHub artifact attestation.
> - Supported channels are the Microsoft Store (#125) and the web/PWA runtime (#130).
>
> The description below is the **v1.2.0-era** trust pipeline, kept as historical release truth.

### Stable public tags (v1.2.0-era policy)

Exact stable tags matching `vMAJOR.MINOR.PATCH` failed closed unless platform trust configuration was present and verification succeeded.

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

Every platform package build emits:

- trust-state evidence;
- SHA-256 checksums;
- a schema-v2 release manifest;
- a packaged-binary smoke report.

The release manifest is fail-closed: it is not generated unless both the trust report and packaged-smoke report exist.

Windows Smart App Control may make an unsigned tester build non-runnable without a safe per-app override. Job Ranger does not recommend disabling Smart App Control, SmartScreen, or Defender.

macOS tester guidance uses Apple's bounded Privacy & Security → Open Anyway flow when macOS offers it. Job Ranger does not recommend disabling Gatekeeper globally.

### Clean-machine evidence tooling

PR #135 made external trust verification reproducible against downloaded/installed artifacts rather than only CI build folders.

Windows verifier support includes explicit artifact/report paths and records SHA-256, Authenticode status, signer metadata, OS/version/architecture, and PowerShell version.

macOS verifier support includes explicit `.app`/report paths and records/enforces codesign, Gatekeeper assessment, stapler validation, host macOS version/build, and architecture.

`docs/CLEAN_MACHINE_TRUST_VALIDATION.md` defines the normal-user install/first-launch evidence procedure. These tools do not automate around SmartScreen, Smart App Control, or Gatekeeper user prompts.

## Shipped v1.2.0 release evidence

Immutable tag:

`v1.2.0` → `71f9b790a1f456321aee2c783f39f4a6784b83a9` (promoted byte-for-byte from `v1.2.0-rc.5`)

Hosted release run `37259653622` succeeded on both Windows and macOS.

rc.5 exists specifically to prove that the clean-machine-capable verifier refactors remain compatible with the native release workflows after PR #135.

### Windows rc.5 evidence

Passed:

- NSIS x64 packaging;
- bundled SQLite verification and packaged resolver verification;
- packaged `Job Ranger.exe` execution from its own `app.asar`;
- deterministic healthcare-operations package-smoke scenario;
- refactored Windows trust verifier execution on `windows-latest`;
- prerelease trust-state verification;
- SHA-256 generation;
- schema-v2 release-manifest generation;
- GitHub prerelease upload.

Published evidence/assets include:

- `Job.Ranger-v1.2.0-windows-x64.exe`;
- `.exe.blockmap`;
- `latest.yml`;
- `windows-package-smoke.json`;
- `windows-signing.json`;
- `windows-SHA256SUMS.txt`;
- `windows-release-manifest.json`.

The GitHub API records SHA-256 digest `5ea12ff3626a4c4d5ae0e063f6a40f3315ea67e0c3a5252a96531890f32b6b76` for the rc.5 Windows installer.

### macOS rc.5 evidence

Passed:

- x64 and arm64 packaging;
- x64/arm64 packaged executable architecture checks;
- native packaged `.app` execution from its own `app.asar` on the hosted runner architecture;
- deterministic healthcare-operations package-smoke scenario;
- refactored macOS trust verifier execution on `macos-latest`;
- prerelease trust-state verification;
- SHA-256 generation;
- schema-v2 release-manifest generation;
- GitHub prerelease upload.

Published evidence/assets include:

- arm64 DMG and ZIP;
- x64 DMG and ZIP;
- `macos-package-smoke.json`;
- `macos-signing.txt`;
- `macos-SHA256SUMS.txt`;
- `macos-release-manifest.json`.

Recorded rc.5 package digests:

- arm64 DMG: `e723fa509004ec2779e00e71c196a0a41ca68e31ad86f21cc739675228e0c5f4`;
- arm64 ZIP: `e2580a70ab55c014fbc842f79bfa2e4992a819c01e3aae2ec0aadc211ce0b923`;
- x64 DMG: `82f4dfe6568bc68957f66039a467f182085a31685d699bd090f52368fd3bbec7`;
- x64 ZIP: `daed79c4633fc92c3797b267d3e7bc2ff6a661f738712689bcd75913142b3b02`.

The rc.5 GitHub Release was marked `prerelease: true`; its artifacts were later promoted byte-for-byte to stable v1.2.0.

## Packaged smoke coverage

The rc.5 packaged smoke uses a materially non-software healthcare operations scenario and validates the packaged application's real local stack:

- isolated fresh data initialization;
- Career Profile creation;
- Target Track creation;
- user-authored Career Evidence;
- pasted evidence/source-artifact persistence;
- company and filter persistence;
- preserved full job-source snapshot;
- requirement extraction and evidence coverage;
- application tracking/status persistence;
- JSON Resume export;
- backup creation/validation;
- durable persistence counts.

The hosted package-smoke reports are release evidence, not a substitute for platform signing or clean-machine trust behavior.

## Upgrade validation

The representative v1.1.2 → v1.2.0 upgrade fixture proves:

- representative legacy SQLite company/job/filter/settings state survives current migrations;
- renderer-local v1.1.2 Career Profile and Application state migrate into the durable model;
- migration is idempotent;
- the legacy Career Profile creates the expected migration-bridge Target Track;
- a byte-identical pre-upgrade database snapshot is preserved;
- post-upgrade backup validates;
- upgraded state restores into another data root with managed paths rebased.

## Repository and UI validation

The release lineage has passed clean install, dependency/security gating, explicit unit suites, typecheck, production build, repository smoke suites, and Electron E2E.

Current E2E coverage includes 31 tests spanning onboarding, Career Evidence, resume generation/tailoring, source discovery, opportunity assessment, application lifecycle, application materials, Career Stories, interview preparation, Search Insights, and Target Tracks.

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
- packaged-binary smoke;
- clean-machine evidence-tool interfaces;
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
- Linux packaged distribution (#129 closed as deferred). Linux users are served by the web/PWA runtime;
- Microsoft Store packaging was not part of v1.2.0 (#133). It is implemented on the post-v1.2.0 line under #125.

## Post-release distribution follow-up

Stable v1.2.0 publication is complete. The certificate-first follow-up (Azure Artifact Signing + Apple Developer ID) was superseded by the accepted distribution architecture: the Microsoft Store (#125) and the web/PWA runtime (#130). v1.2.0 artifacts are immutable and will not be replaced in place.

## Current sources of truth

- `README.md` — public overview and published-vs-candidate boundary;
- `HELP.md` — user workflow/troubleshooting;
- `CHANGELOG.md` — release history and candidate delta;
- `docs/CONCEPT.md` — product purpose/principles;
- `docs/SYSTEM_STATE.md` — this factual snapshot;
- `docs/ARCHITECTURE_PLAN.md` — architecture;
- `docs/RELEASE_READINESS.md` — release-blocking contract;
- `docs/DISTRIBUTION_TRUST.md` — platform trust contract;
- `docs/design/DISTRIBUTION_ARCHITECTURE.md`, `docs/design/PWA_RUNTIME.md`, `docs/design/MICROSOFT_STORE_PACKAGING.md` — forward distribution architecture and its implementation;
- `docs/CLEAN_MACHINE_TRUST_VALIDATION.md` — clean-machine signed-artifact verification procedure;
- `docs/TESTER_INSTALLATION.md` — bounded prerelease installation guidance;
- `docs/PRODUCT_GAP_REVIEW.md` — candidate/deferred/non-goal dispositions;
- `docs/validation/RELEASE_CANDIDATE_V1.2.0.md` — candidate-specific evidence;
- `GOVERNANCE.md`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md` — governance/security/attribution.
