# Job Ranger v1.2.0 Release Candidate Evidence

**Status:** packaged prerelease candidate validated; signed public trust evidence pending  
**Target version:** v1.2.0  
**Published predecessor:** v1.1.2  
**Validated packaged candidate:** v1.2.0-rc.5  
**Candidate commit:** `71f9b790a1f456321aee2c783f39f4a6784b83a9`  
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
- release-blocking packaged-binary consumer smoke;
- reproducible clean-machine signing verification tooling (#130/PR #135);
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
- clean-machine evidence-tool interfaces;
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

PR #134 added release-blocking packaged-binary consumer smoke and schema-v2 release manifests that require both trust-state evidence and package-smoke evidence. Hosted Windows/macOS packaging and the packaged healthcare-operations smoke both passed. rc.4 proved the package-smoke boundary.

### v1.2.0-rc.5

Immutable tag:

`v1.2.0-rc.5` → `71f9b790a1f456321aee2c783f39f4a6784b83a9`

PR #135 made clean-machine trust verification reproducible against downloaded/installed artifacts and preserved the release-workflow interfaces. rc.5 exists to prove those verifier refactors in the native Windows/macOS release environments.

Hosted **Build Release Assets** run `37259653622` completed successfully on both platforms.

## Windows rc.5 evidence

Passed:

- NSIS x64 packaging;
- pinned official SQLite archive verification;
- packaged SQLite presence/execution and resolver selection;
- packaged `Job Ranger.exe` execution using the runtime inside its own `app.asar`;
- deterministic healthcare-operations Career Ops smoke;
- refactored Windows trust-verifier execution on `windows-latest`;
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

Windows installer SHA-256:

`5ea12ff3626a4c4d5ae0e063f6a40f3315ea67e0c3a5252a96531890f32b6b76`

## macOS rc.5 evidence

Passed:

- x64 and arm64 packaging;
- both packaged executable architecture checks;
- native hosted-runner packaged `.app` execution from its own `app.asar`;
- deterministic healthcare-operations Career Ops smoke;
- refactored macOS trust-verifier execution on `macos-latest`;
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

Recorded rc.5 package digests:

- arm64 DMG: `e723fa509004ec2779e00e71c196a0a41ca68e31ad86f21cc739675228e0c5f4`;
- arm64 ZIP: `e2580a70ab55c014fbc842f79bfa2e4992a819c01e3aae2ec0aadc211ce0b923`;
- x64 DMG: `82f4dfe6568bc68957f66039a467f182085a31685d699bd090f52368fd3bbec7`;
- x64 ZIP: `daed79c4633fc92c3797b267d3e7bc2ff6a661f738712689bcd75913142b3b02`.

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

## Clean-machine evidence tooling

PR #135 added reproducible verification for the eventual signed clean-machine validation.

Windows verifier accepts downloaded artifact paths and records:

- SHA-256 / bytes;
- Authenticode status;
- signer subject/issuer;
- Windows version/architecture;
- PowerShell version.

macOS verifier accepts an explicit installed/mounted `.app` and records/enforces:

- `codesign --verify --deep --strict`;
- signature details;
- `spctl` Gatekeeper assessment;
- stapler validation;
- macOS version/build and architecture.

`docs/CLEAN_MACHINE_TRUST_VALIDATION.md` defines the ordinary install/first-launch observation procedure. rc.5 proves both refactored verifiers remain compatible with the native release pipeline.

## Remaining release gates

Repository implementation, migration validation, immutable prerelease packaging, packaged-runtime smoke, and native verifier compatibility are complete.

Still pending before stable publication:

1. actual Azure Artifact Signing account/profile and least-privilege CI credentials;
2. stable Windows installer/app with valid Authenticode evidence;
3. clean supported Windows 11 install/launch observation, including SmartScreen/Smart App Control behavior;
4. Apple Developer Program / Developer ID Application signing identity;
5. signed/notarized/stapled x64 and arm64 macOS stable artifacts with `codesign`, `spctl`, and stapler evidence;
6. clean supported macOS Gatekeeper install/launch observation;
7. immutable stable `v1.2.0` build and final asset/download spot-check;
8. README/download-link and shipped-status transition only after stable assets exist.

The connected Desktop Commander Windows runner is currently offline, so clean-machine Windows trust observation cannot be executed from this session. macOS clean-machine trust evidence likewise requires a real supported Mac. These external trust requirements are distinct from hosted packaged-runtime validation, which has passed.

## Publication boundary

Until the stable trust gates complete:

- v1.1.2 remains the latest stable shipped release;
- v1.2.0-rc.5 is the validated tester prerelease, not the stable public release;
- stable README download links remain on v1.1.2;
- unsigned prerelease installation guidance does not substitute for public platform signing/notarization.
