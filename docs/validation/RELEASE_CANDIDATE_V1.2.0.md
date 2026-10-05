# Job Ranger v1.2.0 Release Candidate Evidence

**Status:** packaged prerelease candidate validated; local consumer smoke and signed public evidence pending  
**Target version:** v1.2.0  
**Published predecessor:** v1.1.2  
**Validated packaged candidate:** v1.2.0-rc.3  
**Candidate commit:** `e25c61c0be21dd00bc80a0880d2a770660c283bd`  
**Preparation date:** 2026-10-04

## Scope decision

v1.2.0 is the selected next release version.

The release is a minor-version increment because it adds substantial backward-compatible product capability without an intentional breaking reset of the user-data or product contract.

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
- release signing/notarization fail-closed plumbing, tester trust evidence, and release checksums/manifests (#125/#128);
- Career Ops / quality-over-quantity product documentation.

## Product work intentionally outside v1.2.0

- broader Career Ops relationship-path implementation; #121 completed the bounded design contract but did not claim implementation;
- Linux packaged support; #129 evaluated and deferred until demand;
- Microsoft Store AppX/MSIX distribution; #133 evaluated as a valid post-release candidate, not current scope;
- remote inference, OCR, DOCX resume export, cloud sync, and other explicitly deferred capabilities.

## Security disposition

### DNS rebinding / #123

#123 is complete.

The candidate now provides connection-level pinning rather than preflight-only DNS validation:

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

Prerelease tags may remain unsigned but are explicitly tester-only. They publish platform trust reports plus SHA-256 sums and machine-readable release manifests.

Actual signed clean-machine evidence remains external and is tracked by #130.

## Repository validation evidence

The v1.2.0 lineage has passed the release repository gates after its major implementation/hardening tranches:

- clean `npm ci`;
- dependency/security gate;
- explicit `npm run test:unit`;
- typecheck;
- production build;
- complete repository smoke/test chain;
- Electron E2E.

Important dedicated evidence includes:

- representative v1.1.2 -> v1.2.0 upgrade/restore fixture;
- canonical source snapshot / source-diagnostic regression;
- DNS-rebinding pinned-transport regression;
- distribution trust configuration regression;
- release checksum/manifest regression;
- macOS optional-signing environment regression.

PR #131's final release-line gate passed clean install, dependency review, explicit unit suite, repository health, and Electron E2E before the trust/checksum changes merged.

PR #132 passed the same release-line gate before the macOS prerelease signing-environment fix merged.

## Upgrade/restore evidence

The representative upgrade fixture proves:

- representative v1.1.2 migrations and existing company/job/filter/settings data survive current initialization;
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

Added completed source-trust/security/distribution work. Windows packaged successfully with SQLite/trust/checksum evidence. macOS exposed an unsigned-prerelease packaging defect: blank `CSC_LINK` / `CSC_KEY_PASSWORD` environment values were interpreted by electron-builder as a certificate source. Tag remains immutable and is not promotable.

### v1.2.0-rc.3

Immutable tag:

`v1.2.0-rc.3` → `e25c61c0be21dd00bc80a0880d2a770660c283bd`

PR #132 fixed the rc.2 macOS packaging defect by sanitizing incomplete signing credentials for tester builds while preserving the stable-release signing fail-closed gate.

Hosted Build Release Assets run **37239803933** completed successfully on both platforms.

### Windows rc.3 evidence

Passed:

- NSIS x64 packaging;
- bundled SQLite verification and runtime resolver verification;
- prerelease Windows trust-state verification;
- SHA-256 generation;
- release-manifest generation;
- GitHub prerelease upload.

Published assets include:

- `Job.Ranger-v1.2.0-windows-x64.exe`;
- `Job.Ranger-v1.2.0-windows-x64.exe.blockmap`;
- `latest.yml`;
- `windows-signing.json`;
- `windows-SHA256SUMS.txt`;
- `windows-release-manifest.json`.

The GitHub API records SHA-256 digest `63c53910757df3a394a387947dbe694a2bb4cd6d1491796336dca0329b83f006` for the rc.3 Windows installer.

### macOS rc.3 evidence

Passed:

- x64 and arm64 packaging;
- prerelease macOS trust-state verification;
- SHA-256 generation;
- release-manifest generation;
- GitHub prerelease upload.

Published assets include:

- arm64 DMG and ZIP;
- x64 DMG and ZIP;
- `macos-signing.txt`;
- `macos-SHA256SUMS.txt`;
- `macos-release-manifest.json`.

Recorded package digests include:

- arm64 DMG: `54bb3236166f3281ebe21b1f55ed8ec03917c22b760366f810f0b77cf850e524`;
- arm64 ZIP: `aa2b5e0ece28affd69c28c13f7ba6dfd875b19b05a307dbd778aee9078258d47`;
- x64 DMG: `aace21d757a2c364beac7df78b26f2f5d3f3666a4c55cece6472c425ebb5524b`;
- x64 ZIP: `b1d9f93262c9c72ea93f51408047c1a04efe3dd972d1b6a529697c698433e32e`.

The GitHub Release is marked `prerelease: true` and remains distinct from stable v1.1.2.

## Remaining release gates

Repository implementation and immutable prerelease packaging are complete.

Still pending before stable publication:

1. packaged consumer smoke against rc.3, including at least one materially non-software career context;
2. actual Azure Artifact Signing account/profile and CI credentials;
3. signed Windows artifact with valid Authenticode evidence;
4. clean supported Windows 11 install/launch observation, including SmartScreen/Smart App Control behavior;
5. Apple Developer Program / Developer ID Application signing identity;
6. signed/notarized/stapled x64 and arm64 macOS artifacts with `codesign`, `spctl`, and stapler evidence;
7. clean supported macOS Gatekeeper install/launch observation;
8. immutable stable `v1.2.0` build and final asset/download spot-check;
9. README/download-link and shipped-status transition only after stable assets exist.

The connected Desktop Commander Windows runner is currently offline, so packaged local consumer smoke is not claimed.

## Publication boundary

Until the stable trust and smoke gates complete:

- v1.1.2 remains the latest stable shipped release;
- v1.2.0-rc.3 is a validated tester prerelease, not the stable public release;
- stable README download links remain on v1.1.2;
- unsigned prerelease installation guidance does not substitute for public platform signing/notarization.
