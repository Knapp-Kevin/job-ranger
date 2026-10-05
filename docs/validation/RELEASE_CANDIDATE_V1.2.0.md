# Job Ranger v1.2.0 Release Candidate Evidence

**Status:** packaged prerelease candidate validated; signed public trust evidence pending  
**Target version:** v1.2.0  
**Published predecessor:** v1.1.2  
**Validated packaged candidate:** v1.2.0-rc.4  
**Candidate commit:** `177e89dc7325bee4787718f89b9c8e2920f28453`  
**Validation date:** 2026-10-05

## Scope decision

v1.2.0 is the selected next release version. It is a backward-compatible minor release containing the accumulated product work since v1.1.2.

Included product areas include:

- progressive onboarding and multiple Target Tracks;
- durable Career Profile and Applications;
- canonical Career Evidence and resume import;
- canonical job-source snapshots and source diagnostics (#117/#118);
- deterministic requirement/evidence mapping and explainable assessment;
- source discovery with explicit approval;
- deterministic resume creation/tailoring and exact submitted-artifact history;
- application lifecycle, Career Stories, interview preparation, and application materials;
- offers, Search Insights, backup/restore, and JSON Resume interoperability;
- cross-career validation fixtures;
- QOR repository hardening;
- connection-pinned anti-rebinding acquisition transport (#123);
- release signing/notarization fail-closed plumbing, tester trust evidence, checksums, and release manifests (#125/#128);
- packaged-binary consumer smoke validation;
- Career Ops / quality-over-quantity product documentation.

## Product work intentionally outside v1.2.0

- broader Career Ops relationship-path implementation; #121 completed the bounded design contract but did not claim implementation;
- Linux packaged support; #129 evaluated and deferred until demand/support justification;
- Microsoft Store AppX/MSIX distribution; #133 evaluated as a valid post-release candidate, not current scope;
- remote inference, OCR, DOCX resume export, cloud sync, and other explicitly deferred capabilities.

## Security disposition

### DNS rebinding / #123

#123 is complete.

The candidate provides connection-level pinning rather than preflight-only DNS validation:

- policy resolution returns the exact approved public address set;
- direct HTTP/HTTPS sockets connect only to approved addresses;
- Host, TLS SNI, and certificate verification remain tied to the original hostname;
- redirects are independently approved and pinned;
- discovery uses the same transport;
- isolated Electron scraper HTTP/HTTPS document/subresource requests are routed through the pinned boundary;
- deterministic regression coverage proves that a later hostile/private DNS answer cannot redirect the direct connection after approval.

Arbitrary generic career-site hostnames remain manual-review/non-runnable in v1.2.0.

### Distribution trust / #125

Stable exact-semver releases fail closed without successful platform trust configuration and verification.

Selected public paths:

- Windows: Microsoft Azure Artifact Signing + Authenticode verification;
- macOS: Developer ID Application signing + hardened runtime + Apple notarization/stapling verification.

Prerelease tags may remain unsigned but are explicitly tester-only. They publish platform trust reports, packaged-smoke reports, SHA-256 sums, and machine-readable release manifests.

Actual signed clean-machine evidence remains external and is tracked by #130.

## Repository and UI validation

The v1.2.0 lineage has passed:

- clean `npm ci`;
- dependency/security gate;
- explicit `npm run test:unit`;
- typecheck;
- production build;
- complete repository smoke/test chain;
- Electron E2E.

Current Electron E2E coverage includes 31 tests spanning onboarding, Career Evidence, resume creation/tailoring, source discovery, opportunity assessment, application lifecycle, materials, Career Stories, interview preparation, Search Insights, and Target Tracks.

Important dedicated regressions include:

- representative v1.1.2 -> v1.2.0 upgrade/restore;
- canonical source snapshot/source-diagnostic behavior;
- DNS-rebinding pinned transport;
- distribution trust configuration;
- release checksum/manifest generation;
- packaged-binary smoke;
- macOS optional-signing environment normalization.

## Upgrade/restore evidence

The representative upgrade fixture proves:

- representative v1.1.2 migrations and company/job/filter/settings data survive current initialization;
- renderer-local v1.1.2 Career Profile and Applications migrate into durable v1.2.0 state;
- migration is idempotent;
- the legacy Career Profile produces the expected bridge Target Track without inventing constraint strength;
- a byte-identical pre-upgrade database snapshot is preserved;
- post-upgrade backup validates;
- upgraded state restores into a different data root with managed paths rebased;
- the original pre-upgrade snapshot remains unchanged as rollback evidence.

## Packaged candidate history

### v1.2.0-rc.1

Initial immutable packaged candidate. Superseded by executable source-trust/security changes. Tag remains immutable.

### v1.2.0-rc.2

Added completed source-trust/security/distribution work. Windows packaged successfully. macOS exposed a tester-packaging defect caused by blank signing environment variables being interpreted as certificate configuration. Tag remains immutable and is not promotable.

### v1.2.0-rc.3

PR #132 fixed the rc.2 macOS packaging defect. Hosted Windows and macOS packaging, trust-state evidence, checksums, and release manifests succeeded. rc.3 proved cross-platform prerelease packaging but predates mandatory packaged-binary smoke evidence.

### v1.2.0-rc.4

Immutable tag:

`v1.2.0-rc.4` → `177e89dc7325bee4787718f89b9c8e2920f28453`

PR #134 added release-blocking packaged-binary consumer smoke and schema-v2 release manifests that require both trust-state evidence and package-smoke evidence.

Hosted **Build Release Assets** run `37258455958` completed successfully on both platforms.

## Windows rc.4 evidence

Passed:

- NSIS x64 packaging;
- pinned official SQLite archive verification;
- packaged SQLite presence/execution and resolver selection;
- packaged `Job Ranger.exe` execution using `ELECTRON_RUN_AS_NODE` and the runtime inside its own `app.asar`;
- deterministic healthcare-operations Career Ops smoke;
- prerelease trust-state verification;
- SHA-256 generation;
- schema-v2 release-manifest generation;
- GitHub prerelease upload.

Published assets/evidence include:

- `Job.Ranger-v1.2.0-windows-x64.exe`;
- `Job.Ranger-v1.2.0-windows-x64.exe.blockmap`;
- `latest.yml`;
- `windows-package-smoke.json`;
- `windows-signing.json`;
- `windows-SHA256SUMS.txt`;
- `windows-release-manifest.json`.

GitHub records SHA-256 digest:

`6d7e4b95fe7fc5bbf60900c8f45130ed0f327e1809d989b7b5586902143765b4`

for the rc.4 Windows installer.

## macOS rc.4 evidence

Passed:

- x64 and arm64 packaging;
- both packaged executable architecture checks;
- native hosted-runner packaged `.app` execution from its own `app.asar`;
- deterministic healthcare-operations Career Ops smoke;
- prerelease trust-state verification;
- SHA-256 generation;
- schema-v2 release-manifest generation;
- GitHub prerelease upload.

Published assets/evidence include:

- arm64 DMG and ZIP;
- x64 DMG and ZIP;
- `macos-package-smoke.json`;
- `macos-signing.txt`;
- `macos-SHA256SUMS.txt`;
- `macos-release-manifest.json`.

Recorded rc.4 package digests:

- arm64 DMG: `f35a4cc3adfc037ddecbc7cc8f8b3fdc630ed0ff742a0cbbefe2ae84d38df849`;
- arm64 ZIP: `2a9e6bf16c8bbc50ad375fd1d578e472e01b8a8feab7353b449a9b657f07b446`;
- x64 DMG: `44bb8d32063c203bf6e1bd1ff4d9755a89fd81ba938fc51d15fb73a3b07f1986`;
- x64 ZIP: `b6981cb7986aaf3ac0c1652502922da21faa242023353aeefbeed802a3aa0f8c`.

The GitHub Release is marked `prerelease: true` and remains distinct from stable v1.1.2.

## Packaged consumer smoke evidence

Both platform packages executed the smoke successfully from their built runtime.

The healthcare-operations scenario validates:

- fresh isolated local data initialization;
- Career Profile creation;
- Target Track creation;
- user-authored Career Evidence;
- pasted evidence/source-artifact persistence;
- employer/filter persistence;
- preserved full job-source snapshot;
- requirement extraction and evidence coverage;
- application tracking/status persistence;
- JSON Resume export;
- backup creation and validation;
- persistence counts after the workflow completes.

The reports are published as `windows-package-smoke.json` and `macos-package-smoke.json` and are required by the platform release manifests.

## Remaining release gates

Repository implementation, migration validation, immutable prerelease packaging, and packaged-runtime smoke are complete.

Still pending before stable publication:

1. actual Azure Artifact Signing account/profile and least-privilege CI credentials;
2. stable Windows installer/app with valid Authenticode evidence;
3. clean supported Windows 11 install/launch observation, including SmartScreen/Smart App Control behavior;
4. Apple Developer Program / Developer ID Application signing identity;
5. signed/notarized/stapled x64 and arm64 macOS stable artifacts with `codesign`, `spctl`, and stapler evidence;
6. clean supported macOS Gatekeeper install/launch observation;
7. immutable stable `v1.2.0` build and final asset/download spot-check;
8. README/download-link and shipped-status transition only after stable assets exist.

The connected Desktop Commander Windows runner is currently offline, so clean-machine Windows trust observation cannot be executed from this session. That is now distinct from packaged-runtime smoke, which has passed.

## Publication boundary

Until the stable trust gates complete:

- v1.1.2 remains the latest stable shipped release;
- v1.2.0-rc.4 is the validated tester prerelease, not the stable public release;
- stable README download links remain on v1.1.2;
- unsigned prerelease installation guidance does not substitute for public platform signing/notarization.
