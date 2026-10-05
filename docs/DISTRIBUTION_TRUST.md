# Distribution Trust

**Status:** forward distribution trust contract for post-v1.2 releases  
**Tracked by:** #125, #130  
**Last reviewed:** 2026-10-05

Job Ranger separates **artifact provenance**, **platform installation trust**, and **runtime security**. A certificate is one possible trust mechanism, not the product's foundational security model.

The accepted distribution architecture is defined in [`design/DISTRIBUTION_ARCHITECTURE.md`](./design/DISTRIBUTION_ARCHITECTURE.md).

## Historical v1.2.0 boundary

Stable **v1.2.0** was published on 2026-10-05 from commit:

`71f9b790a1f456321aee2c783f39f4a6784b83a9`

It was promoted byte-for-byte from validated `v1.2.0-rc.5` artifacts and intentionally published unsigned/unnotarized under an explicit owner-approved exception.

That release remains immutable. The forward distribution decision does not replace, mutate, or retroactively relabel its artifacts.

## Forward release policy

The normal-user distribution strategy after v1.2.0 has two supported targets:

1. **Cross-platform PWA/web runtime** delivered from a controlled HTTPS production origin.
2. **Windows-native Microsoft Store package** certified and signed through the Store distribution path.

Public code-signing certificates owned directly by Job Ranger are no longer a prerequisite for those supported paths.

Direct native binaries published through GitHub may remain useful for development, testing, archival, or informed advanced users, but they are not the preferred mainstream installation path unless they independently satisfy applicable public OS trust requirements.

Job Ranger documentation must never instruct users to disable SmartScreen, Smart App Control, Defender, Gatekeeper, browser security, or equivalent platform security globally.

## Trust layers

### 1. Source and build provenance

Regardless of distribution channel, releases should preserve verifiable relationships between source, build, and artifact.

Current or accepted evidence includes:

- immutable release/tag relationships;
- SHA-256 artifact hashes;
- machine-readable release manifests;
- packaged-runtime smoke evidence;
- exact release commit identity;
- dependency and repository validation;
- artifact/build attestations where they materially improve provenance.

A checksum proves byte identity against a published digest. It does not, by itself, create OS trust.

### 2. Distribution-channel trust

The supported channel determines how an ordinary user's platform establishes installation trust.

- **Microsoft Store:** Store certification and Microsoft-managed package signing establish the normal Windows installation trust path.
- **PWA:** HTTPS origin identity, browser security boundaries, controlled deployment, and service-worker/update integrity establish the normal web-app trust path.

### 3. Runtime security

Trusting the installer or origin does not grant the application unlimited authority.

Existing Job Ranger invariants remain in force, including:

- local-first personal career data;
- explicit user authority for consequential actions;
- acquisition network protections;
- strict renderer/browser security boundaries;
- validated imports;
- evidence-grounded factual claims;
- deterministic backup/export integrity.

## Microsoft Store Windows path

### Selected native Windows path

The Microsoft Store is the primary supported native Windows distribution channel going forward.

The first implementation should prefer the already-evaluated electron-builder v26 `appx` target unless implementation evidence justifies another target.

The Store proof-of-concept must validate:

- Partner Center publisher/package identity;
- AppX manifest/capability generation;
- Store certification;
- packaged Electron sandbox behavior;
- bundled SQLite behavior;
- local data and managed artifact paths;
- source discovery/acquisition;
- resume import/export and PDF generation;
- backup/restore;
- upgrade/update behavior;
- coexistence or migration from the historical NSIS installer where relevant.

Once certified, the Store package should become the recommended Windows-native install path.

### Azure Artifact Signing disposition

Azure Artifact Signing is no longer required to unblock Job Ranger's supported Windows distribution strategy.

Existing Azure signing integration may remain as optional/dormant infrastructure if its maintenance cost is low, but inability to obtain or maintain a Public Trust certificate profile must not block Store or PWA releases.

If Job Ranger later chooses to make a direct-download native Windows installer a normal mainstream channel again, that decision must establish an appropriate public trust path before the installer is promoted as equivalent to the Store channel.

## PWA / web distribution path

The PWA is the primary cross-platform distribution target.

Its trust contract is different from native installer signing and must explicitly cover:

- HTTPS-only production delivery;
- strict CSP/security headers appropriate to the runtime;
- controlled production deployment authority;
- immutable/versioned build identity;
- auditable source-to-deployment provenance;
- service-worker lifecycle, update, and rollback behavior;
- safe local storage migration;
- no silent transmission of Career Evidence or other personal career data merely because the runtime is delivered over the web.

The PWA must remain local-first. A hosted origin is a delivery mechanism, not automatic permission to make the server the authority for user data.

Before the PWA is described as mainstream, validation must cover storage durability/eviction behavior, backup/restore, browser support, update safety, installability where supported, and any environment-specific capability limitations.

## macOS

Native macOS distribution is not currently planned.

Job Ranger will not make Apple Developer Program membership, Developer ID Application signing, notarization, or native macOS packaging a required dependency under the accepted architecture.

macOS users are served through the PWA/web runtime once that runtime meets its validation and capability-parity boundary.

Historical macOS v1.2.0 artifacts remain historical release evidence.

## Linux

Native Linux packaging is not currently planned.

Linux users are served through the PWA/web runtime where supported and validated.

A future native Linux package requires evidence that user value justifies its packaging, update, QA, and support burden.

## SignPath

SignPath is explicitly **not part of the Job Ranger distribution strategy**.

Do not add it as a signing dependency without a future explicit architecture decision reversing this disposition.

## Direct GitHub native artifacts

Direct GitHub binaries may continue to be produced when useful for:

- development;
- package validation;
- troubleshooting;
- archival/reproducibility;
- informed advanced-user testing.

For such artifacts:

- publish exact hashes and provenance evidence;
- label unsigned/untrusted state clearly;
- do not imply Store-equivalent installation trust;
- do not recommend weakening OS security globally;
- keep historical release assets immutable.

## Evidence required before mainstream promotion

### Microsoft Store

Record at minimum:

- exact source commit/tag used for the package;
- package identity/version;
- successful Store certification;
- Store-delivered package identity/signing state;
- clean supported Windows install;
- first launch;
- local persistence behavior;
- upgrade behavior;
- backup/restore behavior;
- packaged smoke result;
- known Store-specific limitations.

### PWA

Record at minimum:

- exact source/build/deployment identity;
- HTTPS origin and production deployment boundary;
- browser/platform matrix exercised;
- local persistence implementation and migration behavior;
- backup/export/restore behavior;
- install/standalone behavior where supported;
- service-worker update and recovery behavior;
- offline/limited-connectivity behavior where claimed;
- known browser/runtime limitations;
- confirmation that personal career data remains local-first by default.

## Relationship to previous signing work

The repository's existing Windows Authenticode verification, macOS verification scripts, checksum generation, package smoke, and release manifests remain valid historical engineering work.

They should not be deleted solely because the distribution strategy changed. They may continue to support direct-artifact verification and historical releases.

What changed is the **forward dependency**: normal Job Ranger distribution no longer requires Job Ranger to obtain and maintain both a Windows public-trust signing profile and Apple Developer ID credentials.
