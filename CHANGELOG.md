# Changelog

All notable user-facing, architecture, governance, and maintenance changes should be recorded here.

## Unreleased

Release-candidate preparation for v1.2.0 is active. Additional changes after the candidate freeze belong here until they are deliberately admitted to the release.

## v1.2.0 - Release candidate

This candidate contains the large body of work implemented after v1.1.2. It is **not shipped to normal users until an immutable tag is validated and a GitHub Release with the expected Windows/macOS assets is published**.

### Added

- Progressive first-run onboarding with resume-first, no-resume, and goal-first entry paths.
- Multiple Target Tracks with required/preferred/target semantics for supported search constraints.
- Durable SQLite-backed Career Profile and Applications state.
- Canonical Career Evidence with provenance, authority state, correction, merge/reject/supersede lineage, structured credentials, references, and direct user authoring.
- Resume import for DOCX, text-bearing PDF, plain text, and pasted text with source preservation, hashing, extraction snapshots, duplicate detection, and explicit OCR-required/failure states.
- Deterministic job requirement normalization and requirement-to-evidence mapping with direct, transferable, ambiguous, and gap states.
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

### Changed

- Replaced the old universal fit-percentage surface with explainable assessment dimensions rather than presenting one opaque number as product truth.
- Career Profile now owns intent/preferences while Career Evidence owns factual career history.
- Application and resume workflows now preserve exact evidence/artifact history rather than relying on mutable filenames or free-form notes.
- Electron privileged implementation authority moved to TypeScript under `electron/src/**`; `electron-runtime/**` is generated for execution and packaging instead of maintaining checked-in compiled copies.
- Repository documentation now uses explicit shipped / release-candidate / implemented-on-main / candidate / deferred / historical status language.
- Job Ranger's product direction is explicitly framed as Career Ops and quality over quantity: understand the person, career direction, companies, people, opportunities, and then applications rather than optimizing raw application throughput.
- Optional remote inference remains deferred because the deterministic product now covers core assessment, tailoring, application materials, interview preparation, stories, and insights without requiring it.
- OCR for image-only resumes and DOCX resume export remain explicit deferrals rather than silent fallbacks.
- Arbitrary generic career-site hostnames remain manual-review in the v1.2.0 candidate rather than being automatically promoted into generic/browser acquisition; recognized provider/vendor domains retain their governed acquisition paths.

### Security and reliability

- Sandboxed the primary renderer and retained context isolation, disabled Node integration, and web security boundaries.
- Added acquisition-network policy that rejects unsafe loopback, link-local, and private-network destinations and validates redirect/DNS targets before automated acquisition.
- Hardened privileged IPC numeric ranges, source-vendor hostname classification, managed artifact reveal paths, and record-shape validation.
- Removed duplicate/generated privileged validator implementations and tracked build/test residue so `electron/src/**` remains the checked-in privileged authority.
- Expanded repository-health coverage to exercise real salary, scrape-guard, tray-policy, and QOR hardening regressions.
- Hardened SQLite-backed persistence, migration, and E2E locking behavior.
- Made high-severity dependency audit findings fail closed except for narrowly documented upstream-blocked tooling exceptions.
- Added backup integrity validation and staged restore safeguards.
- Narrowed the v1.2.0 automated network surface by disabling arbitrary generic-host acquisition and adding regression coverage for that restriction.
- Known residual risk: hostname validation is performed before the underlying Node/Chromium connection and is not yet connection-pinned against a DNS-rebinding time-of-check/time-of-use change. This remains tracked in #123. The release mitigation narrows exposure but does not make the transport rebinding-proof.

### Release engineering

- Added generated Electron-runtime build authority and package configuration for `electron-runtime/electron/src/main.cjs`.
- Expanded repository-health and Electron E2E coverage across Career Evidence, targeting, discovery, assessment, resume lifecycle/tailoring, credentials, application lifecycle, Career Stories, materials, interview prep, insights, backup/restore, interoperability, and hardening regressions.
- Added `docs/RELEASE_READINESS.md` as the release-blocking contract for documentation, migration, security, platform packaging, and product-smoke evidence.
- Added `docs/PRODUCT_GAP_REVIEW.md` to record evaluated capabilities as needed, candidate, deferred, or rejected/non-goal.
- Staged `package.json` and `package-lock.json` root metadata consistently at v1.2.0 on the release-candidate branch.
- Added candidate-specific evidence under `docs/validation/RELEASE_CANDIDATE_V1.2.0.md`.

### Candidate validation boundary

- Fresh final-head repository validation is required after the QOR hardening, #123 release mitigation, and candidate-documentation reconciliation.
- Upgrade/migration/backup/restore testing from representative v1.1.2 data remains required.
- Windows NSIS x64 and macOS x64/arm64 packaging must be built from the immutable candidate tag and exercised before publication.
- Production signing/notarization evidence must be recorded where credentials are available; any limitation must be stated explicitly.
- README download links and `docs/SYSTEM_STATE.md` shipped labels must not move to v1.2.0 until release assets actually exist.

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
