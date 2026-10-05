# Release Readiness Contract

This document defines the minimum evidence required before Job Ranger publishes a new user-installable release.

A merged `main` branch is **not** a release. A passing unit test is **not** a release. Electron Builder being theoretically configured for a platform is **not** a release. A release exists only when an immutable version/tag has been validated and published with the artifacts users are actually expected to run.

## Status authority

- **Published GitHub Release**: authority for what users can download.
- **Immutable release tag**: authority for the source used to build a release.
- **`main`**: authority for current merged development, which may be ahead of the published product.
- **Documentation on `main`**: must describe both boundaries honestly.

The current published stable release is **v1.1.2**. The v1.2.0 candidate line is materially ahead and must not be represented as shipped until a stable release completes this contract.

## Release-blocking checklist

### 1. Scope and version

- [ ] The intended release scope is frozen.
- [ ] Every included pull request is merged to the candidate commit.
- [ ] No known release-blocking issue remains open.
- [ ] The target version has been deliberately selected.
- [ ] `package.json`, release notes, badges/download links, and generated artifact names agree on the selected version where applicable.
- [ ] The immutable candidate tag points to the exact validated commit.

Do not bump versions early merely to create the appearance of release progress.

### 2. Product truth and documentation

- [ ] `README.md` distinguishes shipped behavior from newer `main` behavior correctly.
- [ ] `HELP.md` matches the actual user interface and workflows in the candidate.
- [ ] `CHANGELOG.md` has a complete candidate entry derived from the `Unreleased` section.
- [ ] `docs/SYSTEM_STATE.md` matches the candidate architecture and capabilities.
- [ ] `docs/ARCHITECTURE_PLAN.md` matches the candidate service and trust boundaries.
- [ ] `docs/planning/PLAN.md` contains only genuine next/deferred work.
- [ ] `docs/README.md` correctly classifies current, design, validation, research, and historical documents.
- [ ] `SECURITY.md`, `GOVERNANCE.md`, and `THIRD_PARTY_NOTICES.md` remain accurate.
- [ ] User-visible limitations and deferrals are stated rather than hidden.

Documentation drift is a release blocker because users and contributors otherwise cannot tell what software they are evaluating.

### 3. Data and migration safety

- [ ] Upgrade from the latest published release is exercised against a representative existing data directory.
- [ ] All SQLite migrations apply successfully and idempotently.
- [ ] Career Profile, Career Evidence, Applications, source state, resume artifacts, lifecycle state, Career Stories, insights, and settings remain readable after upgrade.
- [ ] Managed artifact paths resolve after upgrade.
- [ ] Backup creation succeeds before destructive/manual migration testing.
- [ ] Backup validation detects tampering/corruption.
- [ ] Restore into a different data root is exercised and managed paths rebase correctly.
- [ ] A staged restore is not allowed to destroy the only known-good live copy before the restored database initializes successfully.

### 4. Security and dependency review

- [ ] Current dependency audit is reviewed.
- [ ] Any vulnerability exception is narrow, documented, and limited to the exact dependency/path/risk that cannot yet be remediated.
- [ ] Renderer/main-process boundaries remain `nodeIntegration: false`, `contextIsolation: true`, and `webSecurity: true` where required.
- [ ] Main renderer sandboxing remains enabled.
- [ ] Specialized hidden browser/render surfaces retain their restricted settings.
- [ ] External navigation remains validated.
- [ ] Automated acquisition rejects loopback, link-local, and private-network destinations and binds approved hostname resolution to the actual connection so DNS rebinding cannot silently change the destination.
- [ ] Imported career documents remain untrusted input and do not silently trigger hosted OCR/inference.
- [ ] No new telemetry, sync, inference, credential, or cloud transmission exists without explicit governance and user disclosure.

### 5. Repository validation

Job Ranger may preserve hosted Actions budget for routine documentation/remediation work, but an immutable release candidate needs explicit repository validation evidence.

Minimum repository validation:

```bash
npm ci
npm run typecheck
npm run build
npm run test
npm run test:unit
npm run test:e2e
```

`npm run repo:health` may be used as the combined type/build/backend gate. Do not claim a command passed if the environment could not execute it.

For documentation-only remediation, code tests may reuse fresh evidence from the unchanged executable candidate commit, but documentation-specific validation must still be performed.

### 6. Documentation validation

- [ ] Markdown links among current source-of-truth documents resolve.
- [ ] No current document describes completed work as planned.
- [ ] No current document claims unreleased `main` functionality is shipped.
- [ ] References to issues/PRs use the correct completion state.
- [ ] No current document points users to removed runtime files or obsolete commands.
- [ ] Historical plans are unmistakably historical from the documentation index.
- [ ] Screens/workspace names in HELP match current navigation.

### 7. Windows package validation

- [ ] Build from the immutable release tag on the supported Windows builder.
- [ ] NSIS x64 installer is produced with the expected versioned filename.
- [ ] Official pinned SQLite CLI archive is downloaded and its published SHA3-256 verified.
- [ ] Packaged `resources/sqlite3.exe` exists and executes.
- [ ] With `SQLITE3_PATH` removed, runtime resolution selects the packaged SQLite binary.
- [ ] Generated `electron-runtime` entry point exists in the packaged application.
- [ ] The packaged `Job Ranger.exe` executes the headless package-smoke harness from its own `app.asar` using an isolated data root.
- [ ] `windows-package-smoke.json` reports `passed` for the required non-software scenario and is included in release evidence.
- [ ] Installer launch/upgrade is exercised on a clean supported Windows system before stable publication.
- [ ] Existing user data survives installer upgrade.
- [ ] A stable public release carries valid Authenticode signatures and records observed SmartScreen / Smart App Control behavior on a clean supported machine.

### 8. macOS package validation

For both x64 and arm64:

- [ ] Build from the immutable release tag.
- [ ] Expected DMG/ZIP artifacts are produced.
- [ ] Generated Electron runtime entry point is present.
- [ ] Both packaged executable architectures are verified from the unpacked build output.
- [ ] The native hosted-runner packaged executable executes the headless package-smoke harness from its own `app.asar` using an isolated data root.
- [ ] `macos-package-smoke.json` reports `passed` for the required non-software scenario and is included in release evidence.
- [ ] SQLite resolution works in the packaged application.
- [ ] A stable public release is Developer ID signed, notarized, stapled, and passes `codesign`, `spctl`, and stapler verification.
- [ ] The signed/notarized application launches on a clean supported macOS system under Gatekeeper before stable publication.

### 9. Product smoke validation

Release automation must exercise a deterministic packaged consumer spine using a materially non-software scenario. The package-smoke harness currently validates:

1. fresh isolated local data initialization;
2. Career Profile creation;
3. Target Track creation;
4. user-authored Career Evidence;
5. pasted evidence/source-artifact persistence;
6. employer and filter persistence;
7. preserved full job-source snapshot;
8. requirement extraction/evidence coverage;
9. application tracking/status persistence;
10. JSON Resume export;
11. backup creation and validation;
12. persistence counts after the workflow completes.

This hosted packaged smoke is release-blocking and its machine-readable report must exist before the release manifest can be generated.

It does **not** replace final clean-machine acceptance for behavior that depends on the operating system's trust/user-interaction layer. Before stable publication, record real installation/launch behavior for the signed Windows build and the signed/notarized macOS build. Human UI acceptance may reuse current Electron E2E evidence where the candidate UI code is unchanged, but any candidate-specific UI defect or installer interaction must be exercised directly.

### 10. Release publication

- [ ] Release title and notes describe only behavior present in the tag.
- [ ] Windows and macOS assets have completed upload before the release is presented as complete.
- [ ] Each platform release manifest references both trust evidence and packaged-smoke evidence.
- [ ] Download links in the root README are updated only after assets exist.
- [ ] Changelog release date/version is finalized.
- [ ] `docs/SYSTEM_STATE.md` moves candidate features from “implemented on main” to “shipped” only after publication.
- [ ] Post-release install/download is spot-checked from the actual GitHub Release page.

## Evidence record

Each release should record:

- tag and commit SHA;
- validation date;
- validator/environment;
- commands executed;
- package/artifact names;
- platform results;
- packaged-smoke report for each supported platform;
- signing/notarization trust evidence;
- migrations tested from which prior version;
- known limitations or waived checks and rationale;
- links to retained validation evidence.

## Current v1.2.0 release-readiness blockers

As of the rc.3 reconciliation:

1. v1.1.2 remains the latest stable public release.
2. rc.3 proved Windows x64 and macOS x64/arm64 packaging, bundled SQLite/trust evidence, checksums, and release-manifest upload, but predates mandatory packaged-binary smoke evidence.
3. The next immutable candidate must prove the new packaged-binary smoke gate on both platform jobs.
4. Stable Windows publication still requires actual Azure Artifact Signing credentials plus signed clean-machine Windows 11 installation/launch evidence.
5. Stable macOS publication still requires Apple Developer ID signing/notarization credentials plus clean-machine Gatekeeper installation/launch evidence.

These are release tasks, not reasons to mislabel `main` as shipped or to weaken platform security settings for ordinary users.
