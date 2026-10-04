# Release Readiness Contract

This document defines the minimum evidence required before Job Ranger publishes a new user-installable release.

A merged `main` branch is **not** a release. A passing unit test is **not** a release. Electron Builder being theoretically configured for a platform is **not** a release. A release exists only when an immutable version/tag has been validated and published with the artifacts users are actually expected to run.

## Status authority

- **Published GitHub Release**: authority for what users can download.
- **Immutable release tag**: authority for the source used to build a release.
- **`main`**: authority for current merged development, which may be ahead of the published product.
- **Documentation on `main`**: must describe both boundaries honestly.

The current published release is **v1.1.2**. The current default branch is materially ahead and must not be represented as shipped until a new release completes this contract.

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
- [ ] Automated acquisition rejects loopback, link-local, and private-network destinations, including redirects/DNS resolution behavior.
- [ ] Imported career documents remain untrusted input and do not silently trigger hosted OCR/inference.
- [ ] No new telemetry, sync, inference, credential, or cloud transmission exists without explicit governance and user disclosure.

### 5. Manual repository validation

Job Ranger intentionally preserves GitHub Actions budget. Hosted CI is **not required** for routine documentation/remediation or every release-preparation iteration. The maintainer may perform the equivalent checks manually in an isolated environment.

Record the environment and exact commands used.

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

For documentation-only remediation, code tests may reuse fresh evidence from the unchanged candidate commit, but documentation-specific validation must still be performed manually.

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
- [ ] Installer launch/upgrade is exercised on Windows.
- [ ] Existing user data survives installer upgrade.

### 8. macOS package validation

For both x64 and arm64:

- [ ] Build from the immutable release tag.
- [ ] Expected DMG/ZIP artifacts are produced.
- [ ] Generated Electron runtime entry point is present.
- [ ] SQLite resolution works in the packaged application.
- [ ] Application launches and the primary workflow opens.
- [ ] Signing/notarization evidence is recorded when release credentials are available.
- [ ] If notarization could not be performed, release notes state that limitation rather than implying it occurred.

### 9. Product smoke validation

At minimum, validate the full consumer spine on a clean profile:

1. first-run onboarding;
2. create at least one target track;
3. import or directly author Career Evidence;
4. add/discover and approve a source;
5. collect/review a job;
6. inspect explainable opportunity assessment;
7. track the job/application;
8. prepare/export a resume;
9. verify exact submitted-artifact linkage;
10. add lifecycle contact/event/reminder state;
11. open interview prep;
12. create an application material;
13. create/review a Career Story;
14. inspect Search Insights with representative saved state;
15. create and validate a backup;
16. verify JSON Resume import/export boundaries.

The smoke run should include at least one materially non-software career context before publication.

### 10. Release publication

- [ ] Release title and notes describe only behavior present in the tag.
- [ ] Windows and macOS assets have completed upload before the release is presented as complete.
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
- migrations tested from which prior version;
- known limitations or waived checks and rationale;
- links to any retained validation evidence.

## Current release-readiness blockers

As of the October 2026 documentation reconciliation:

1. v1.1.2 is still the latest published release and does not contain the large body of completed work on `main`.
2. Public/current documentation required reconciliation before a new release could honestly be prepared.
3. A full immutable-tag Windows/macOS packaging pass for the accumulated post-v1.1.2 changes has not yet been recorded.
4. Production notarization must be validated when the release environment has the required Apple credentials.

These are release tasks, not reasons to mislabel `main` as shipped.
