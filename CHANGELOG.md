# Changelog

All notable user-facing, architecture, governance, and maintenance changes should be recorded here.

## Unreleased

v1.2.0 release-candidate work is frozen around the validated `v1.2.0-rc.3` packaged candidate. Stable publication remains blocked on packaged consumer smoke plus real Windows signing / macOS signing-notarization clean-machine evidence.

## v1.2.0 - Release candidate

The current immutable packaged candidate is `v1.2.0-rc.3` at `e25c61c0be21dd00bc80a0880d2a770660c283bd`. Windows x64 and macOS x64/arm64 packages, prerelease trust reports, SHA-256 sums, and release manifests have been built and published successfully. v1.2.0 is **not** the stable public release until the remaining trust/smoke gates complete.

### Added

- Progressive first-run onboarding with resume-first, no-resume, and goal-first entry paths.
- Multiple Target Tracks with required/preferred/target semantics for supported search constraints.
- Durable SQLite-backed Career Profile and Applications state.
- Canonical Career Evidence with provenance, authority state, correction, merge/reject/supersede lineage, structured credentials, references, and direct user authoring.
- Resume import for DOCX, text-bearing PDF, plain text, and pasted text with source preservation, hashing, extraction snapshots, duplicate detection, and explicit OCR-required/failure states.
- Canonical job-source snapshots with source URL, retrieval time, hashes, completeness state, extraction/version metadata, dedupe, and changed-content history.
- Source reliability diagnostics that distinguish success-empty, cooldown/circuit, unsupported/browser-unavailable, network-policy, access-denied, rate-limit, timeout/retrieval, extraction, parser, and unclassified failures.
- Deterministic job requirement normalization and requirement-to-evidence mapping with direct, transferable, ambiguous, and gap states tied to the preserved source text used for analysis.
- Multi-dimensional opportunity assessment covering eligibility, evidence coverage, career alignment, preference alignment, blockers, and unknowns.
- Consumer source discovery behind a provider-neutral seam with explicit user approval before monitoring discovered sources.
- Deterministic resume creation with ATS-oriented templates, Truth Gate, isolated Chromium PDF rendering, Parseability Gate, versioned artifacts, diffs, and exact application linkage.
- Deterministic target-specific resume tailoring with preserved evidence provenance.
- Application lifecycle contacts, milestones, follow-up events, reminders, and exact submitted-resume history.
- Evidence-linked Career Stories.
- Evidence-grounded interview preparation that distinguishes exact submitted evidence, later-corrected/superseded evidence, additional confirmed evidence, and real gaps.
- Versioned evidence-grounded application materials that become visibly stale when supporting Career Evidence changes.
- Structured target-track attribution, offer/negotiation state, recurring-gap analysis, observed outcome summaries, and Search Insights.
- Verified portable backup and staged restore with artifact integrity checks and cross-data-root path rebasing.
- JSON Resume import/export as a bounded interoperability adapter without making JSON Resume canonical product state.
- Universal cross-career validation fixtures, including hourly/local, healthcare, trades, executive, recent graduate, federal/government, contractor/freelance, career-change, return-to-work, and military-transition contexts.
- Connection-pinned HTTP/HTTPS acquisition transport with per-hop redirect approval and deterministic DNS-rebinding regression coverage.
- Stable-release platform-trust gates for Windows Azure Artifact Signing and macOS Developer ID signing/notarization/stapling.
- Per-platform release trust reports, SHA-256 checksum files, and machine-readable release manifests.
- Bounded tester-installation guidance for unsigned prereleases that does not require disabling platform security globally.

### Changed

- Replaced the old universal fit-percentage surface with explainable assessment dimensions rather than presenting one opaque number as product truth.
- Career Profile now owns intent/preferences while Career Evidence owns factual career history.
- Application and resume workflows now preserve exact evidence/artifact history rather than relying on mutable filenames or free-form notes.
- Requirement analysis now uses preserved canonical source text instead of being constrained to the legacy short description snippet.
- Electron privileged implementation authority moved to TypeScript under `electron/src/**`; `electron-runtime/**` is generated for execution and packaging instead of maintaining checked-in compiled copies.
- Repository documentation uses explicit stable / packaged-candidate / implemented / candidate / deferred / historical status language.
- Job Ranger's product direction is explicitly framed as quality-over-quantity Career Ops: understand the person, career direction, companies, people, opportunities, and then applications rather than optimizing raw application throughput.
- Optional remote inference remains deferred because the deterministic product covers core assessment, tailoring, application materials, interview preparation, stories, and insights without requiring it.
- OCR for image-only resumes and DOCX resume export remain explicit deferrals rather than silent fallbacks.
- Arbitrary generic career-site hostnames remain manual-review/non-runnable rather than being automatically promoted into privileged generic acquisition.
- Linux packaging was evaluated and deferred until real demand justifies the support surface.
- Microsoft Store AppX/MSIX distribution was evaluated as a valid post-v1.2.0 candidate but not admitted to the current release scope.

### Security and reliability

- Sandboxed the primary renderer and retained context isolation, disabled Node integration, and web security boundaries.
- Added acquisition-network policy that rejects unsafe loopback, link-local, private-network, and other disallowed destinations.
- Replaced preflight-only DNS approval with connection-level address pinning: sockets connect only to policy-approved public addresses while Host/SNI/TLS verification remains bound to the original hostname.
- Redirects are independently resolved, approved, and pinned per hop.
- Source discovery uses the same pinned transport.
- Isolated Electron scraper HTTP/HTTPS document and subresource traffic is routed through the governed pinned transport.
- Added deterministic regression coverage proving a hostile later DNS answer cannot redirect the direct transport to a private/local destination.
- Hardened privileged IPC numeric ranges, source-vendor hostname classification, managed artifact reveal paths, and record-shape validation.
- Removed duplicate/generated privileged validator implementations and tracked build/test residue so `electron/src/**` remains the checked-in privileged authority.
- Expanded repository-health coverage to exercise salary, scrape-guard, tray-policy, source-truth, DNS-rebinding, distribution-trust, and QOR regressions.
- Hardened SQLite-backed persistence, migration, and E2E locking behavior.
- Made high-severity dependency audit findings fail closed except for narrowly documented upstream-blocked tooling exceptions.
- Added backup integrity validation and staged restore safeguards.
- Stable exact-semver release builds fail closed when required Windows signing or macOS signing/notarization configuration/verification is absent.

### Release engineering

- Added generated Electron-runtime build authority and package configuration for `electron-runtime/electron/src/main.cjs`.
- Expanded repository-health and Electron E2E coverage across Career Evidence, targeting, discovery, assessment, source truth, resume lifecycle/tailoring, credentials, application lifecycle, Career Stories, materials, interview prep, insights, backup/restore, interoperability, and hardening regressions.
- Added `docs/RELEASE_READINESS.md` as the release-blocking contract.
- Added `docs/PRODUCT_GAP_REVIEW.md` for candidate/deferred/rejected dispositions.
- Synchronized `package.json` and root `package-lock.json` metadata at v1.2.0.
- Added candidate-specific evidence under `docs/validation/RELEASE_CANDIDATE_V1.2.0.md`.
- Added `docs/DISTRIBUTION_TRUST.md` and `docs/TESTER_INSTALLATION.md`.
- Added Windows and macOS trust-verification scripts.
- Added post-package SHA-256/release-manifest generation that requires the corresponding trust-evidence file to exist.
- Fixed unsigned macOS prerelease packaging so blank/incomplete signing environment variables are removed before electron-builder rather than being misinterpreted as a certificate source.
- `v1.2.0-rc.3` hosted release run `37239803933` completed successfully for Windows x64 and macOS x64/arm64 with expected package/trust/checksum/manifest assets uploaded.

### Remaining stable-release boundary

Before stable v1.2.0 publication:

- perform packaged consumer smoke against rc.3, including a materially non-software career scenario;
- configure/verify real Azure Artifact Signing and record clean Windows 11 behavior;
- configure/verify real Developer ID signing, Apple notarization/stapling, and clean macOS Gatekeeper behavior;
- build the immutable stable tag;
- verify final stable assets/downloads;
- only then update README download links and shipped-status documentation from v1.1.2 to v1.2.0.

## v1.1.2 - 2026-09-24

### Fixed

- Restored readable inactive sidebar navigation in the Midnight theme.
- Replaced inert dashboard text styled like links with real contextual navigation to Find Jobs, Companies, and Filters.
- Removed stale Alpha-facing workspace language from the released dashboard.

### Changed

- Removed the HVAC-specific starter and occupation-specific placeholders from primary Career Profile onboarding.
- Reframed role targeting around current, adjacent, and reasonable stretch opportunities across careers.
- Generalized minimum compensation from an hourly-only field to an hourly-or-annual preference.
- Simplified the sidebar brand area by removing the theme description and redundant `Local desktop` pill.

### Compatibility and validation

- Existing v1 Career Profiles preserve their saved hourly minimum through the v2 profile migration.
- Deterministic fit scoring compares listed compensation against the user's selected hourly or annual basis.
- Repository-health validation and Electron E2E cover the updated navigation and Career Profile behavior.
- Dependency audit remains at zero known npm vulnerabilities.

## v1.1.1 - 2026-09-24

### Fixed

- Made the Windows release self-contained by bundling the official SQLite 3.53.4 x64 command-line runtime used by the desktop backend.
- Updated Windows runtime resolution so packaged builds prefer `resources/sqlite3.exe` before host `PATH` while development still supports `SQLITE3_PATH` or a host install.
- Standardized the published Windows artifact on the NSIS installer target instead of generating two same-named `.exe` targets.

### Release engineering

- Pinned the official SQLite Windows tools archive used by the release workflow.
- Added SHA3-256 verification against SQLite's published digest before extraction.
- Added Windows packaging validation that executes the bundled SQLite binary and proves the runtime resolver selects it with `SQLITE3_PATH` removed.
- Added durable Windows packaging evidence under `docs/windows-package-validation.md`.
- Added SQLite runtime provenance to `THIRD_PARTY_NOTICES.md`.

### Release note

- v1.1.0 successfully produced the macOS x64/arm64 artifacts but its Windows builder exposed the missing-host-SQLite defect before a Windows asset was uploaded.
- v1.1.1 supersedes v1.1.0 as the first complete Windows + macOS release of the v1.1 feature line.

## v1.1.0 - 2026-09-24

### Added

- Career Profile onboarding for target roles, location, pay floor, skills, credentials, and work preferences.
- Career Profile role targeting for jobs the user would consider. The first iteration included one occupation-specific starter; v1.1.2 removed that product-level specialization and generalized onboarding across careers.
- Deterministic job-fit scoring with plain-language reasons and concerns derived only from saved profile data and collected listing evidence.
- Applications workspace with Interested, Applied, Interview, Offer, Rejected, and Withdrawn states plus local notes.
- Career-Ops lineage and MIT attribution in `THIRD_PARTY_NOTICES.md`.
- Pull-request CI running clean dependency installation, audit reporting, and the repository-health gate.
- Grouped Dependabot policy for routine non-major production and development dependency updates.
- Canonical Job Ranger brand assets for the repository banner, logo lockup, and social preview.
- Repository governance, contribution, security, code-of-conduct, branding, and documentation-index guidance.

### Changed

- Reorganized primary navigation around the job-seeker workflow: Home, Find Jobs, Applications, Career Profile, then source/filter/settings tools.
- Upgraded Electron from the unsupported 28.x line to supported Electron 44.4.5.
- Raised the development and release Node.js baseline to 22.12.0 or newer.
- Upgraded the build stack to Vite 8 and TypeScript 7.
- Upgraded `@electron/notarize`, `@electron/fuses`, and `concurrently` to Node 22-compatible current lines.
- Migrated the macOS notarization hook across the CommonJS/ESM boundary using dynamic import and removed the obsolete notarization `tool` option.
- Updated TypeScript configuration for TypeScript 7 and Vite side-effect module declarations.
- Reworked public documentation around verified shipped, implemented, planned, and historical states.
- Updated Electron Playwright tests for the current accessible UI and Career Intelligence navigation.
- Consolidated branding assets under `docs/assets/branding/` while preserving `public/ICON.png` as the canonical runtime icon.

### Fixed

- Added a bounded SQLite client timeout to prevent transient concurrent access from failing immediately with `database is locked`.
- Corrected SQLite CLI timeout configuration so timeout setup does not contaminate JSON query output.
- Restored accessible modal semantics and filter-form label/control associations discovered by Electron E2E validation.

### Security

- Completed the accumulated non-major dependency-security remediation without `npm audit fix --force`.
- Eliminated the remaining Electron / `extract-zip` high-severity findings by moving to the supported Electron runtime.
- The v1.1.0 release-prep dependency audit reports zero known npm vulnerabilities.
- Removed obsolete duplicate packaging/notarization scripts and temporary write-capable validation workflows after use.

### Persistence note

- Existing companies, jobs, filters, settings, and scrape history remain SQLite-backed.
- Career Profile and Applications are local in v1.1.0 but currently use renderer-local storage. Moving them behind the SQLite/backend boundary remains planned durability work.

## v1.0.2 - 2026-03-20

- Fixed Electron startup on macOS by resolving `sqlite3` with platform-aware lookup instead of a Windows-only command.
- Hardened tray initialization so a missing or invalid tray icon does not prevent the app from launching.
- Added the Electron runtime and source files required for packaged/runtime consistency in the repository.
- Published Windows x64 and macOS x64/arm64 release artifacts.
