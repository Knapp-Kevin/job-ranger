# Job Ranger v1.2.0 Release Candidate Evidence

**Status:** repository candidate validated; platform publication evidence pending  
**Target version:** v1.2.0  
**Published predecessor:** v1.1.2  
**Preparation branch:** `release/v1.2.0-rc1`  
**Candidate base:** `main@20c8d776fe629d5310c486a6496f2b1af07d88c0`  
**Validated product head:** `f4eb6d695377f8599827dd7cc453bcf634cd5713`  
**Preparation date:** 2026-10-04

## Scope decision

v1.2.0 is the selected next release version.

The release is a minor-version increment because it adds substantial backward-compatible product capability without intentionally resetting the user-data model or introducing a governed breaking product contract.

The candidate scope is frozen around the completed post-v1.1.2 product plus accepted repository hardening already merged to `main` and the release-specific #123 mitigation described below.

Included product areas:

- progressive onboarding;
- multiple Target Tracks and explicit constraint semantics;
- durable Career Profile and Applications;
- canonical Career Evidence and resume import;
- deterministic requirement/evidence mapping and explainable opportunity assessment;
- source discovery with explicit approval;
- deterministic resume creation/tailoring and exact submitted-artifact history;
- application lifecycle, interview preparation, Career Stories, and application materials;
- offers, Search Insights, backup/restore, and JSON Resume interoperability;
- cross-career validation fixtures;
- QOR hardening tranche covering privileged numeric validation, source-domain classification, generated-runtime authority cleanup, managed artifact path confinement, record-shape validation, test coverage, and generated residue cleanup;
- Career Ops / quality-over-quantity documentation clarification.

## Explicitly outside candidate scope

The following remain follow-on work unless a release-blocking defect is discovered:

- #117 canonical job-description/source snapshots;
- #118 dynamic-source diagnostics and reliability measurement;
- #121 Career Ops relationship-path / intentional-pursuit implementation.

Those are valuable product-quality or design tracks, but they are not required to represent the already-completed v1.2.0 product honestly.

## Security disposition

### #123 DNS-rebinding connection pinning

Current automated acquisition validates URL syntax, rejects private/loopback/link-local/reserved destinations, resolves hostname targets before requests, and validates redirects. Browser-backed requests are also preflighted through the acquisition network policy.

The remaining architectural issue is a time-of-check/time-of-use gap: the transport can perform a later DNS resolution when the actual Node or Chromium connection is established. The address approved during policy validation is therefore not connection-pinned.

The release candidate must not describe the current implementation as connection-pinned or rebinding-proof.

### v1.2.0 release mitigation

The candidate disables automated acquisition for **arbitrary generic career-site hostnames**:

- unknown/generic career pages resolve to `unsupported` / manual-review rather than `generic-html` automation;
- the `generic-html` source profile is non-runnable in the candidate;
- recognized provider/vendor domains and known browser portals retain their governed acquisition paths;
- QOR and backend regression coverage assert that arbitrary generic career URLs remain unsupported and non-runnable;
- `README.md`, `HELP.md`, `SECURITY.md`, and `docs/SYSTEM_STATE.md` explicitly describe the restriction and the remaining connection-pinning gap.

This removes the broad attacker-controlled-hostname entry path that existed when arbitrary career-looking URLs were automatically classified for generic acquisition. It materially narrows the practical v1.2.0 attack surface.

It does **not** resolve #123 in the general case. Recognized provider domains still rely on preflight DNS validation rather than transport-level address pinning. #123 remains open for the durable architecture.

Release disposition:

- **v1.2.0 mitigation implemented and regression-tested;**
- **full connection-level protection remains governed by #123;**
- **release documentation explicitly acknowledges the residual risk and does not claim rebinding-proof transport.**

## Validation evidence

### Validated product head

Product/runtime candidate head `f4eb6d695377f8599827dd7cc453bcf634cd5713` passed both release workflows on October 4, 2026.

**CI run `37183153646`: success**

The `repository-health` job passed all release-candidate steps:

- clean checkout;
- Node.js 22.12.0 setup;
- `npm ci`;
- `node scripts/audit-dependencies.mjs`;
- explicit `npm run test:unit`;
- `npm run repo:health`, which executes typecheck, production build, and the complete repository test/smoke chain.

The dependency gate reported the already-governed `GHSA-ch52-4w7c-c8xp` dev-tool exception through `http-cache-semantics`; it rejected no runtime or unrelated high/critical findings.

The repository smoke chain explicitly passed the new representative upgrade test:

> `v1.1.2 -> v1.2.0 upgrade and restore smoke passed!`

That fixture proves, in an isolated test installation:

- representative v1.1.2 migrations 1-2 and existing company/job/filter/settings state survive current initialization;
- renderer-local v1.1.2 Career Profile and Application state migrate into the durable v1.2.0 model;
- the migration is idempotent;
- the legacy Career Profile produces the expected migration-bridge Target Track without inventing constraint strength;
- a pre-upgrade database snapshot is preserved byte-for-byte;
- a post-upgrade Job Ranger backup validates;
- the upgraded state restores successfully into a different user-data root;
- the original pre-upgrade snapshot remains unchanged as rollback evidence.

**Electron E2E run `37183153774`: success**

The Electron E2E job passed `xvfb-run -a npm run test:e2e` on the same product/runtime candidate head.

### Documentation-only evidence commits after validation

This evidence record and any subsequent issue/PR metadata reconciliation are documentation/governance updates only. They do not change the validated product/runtime implementation. If a later commit changes executable source, package metadata, tests, dependency state, build configuration, or release behavior, the product-head validation must be rerun and this section updated.

## Version metadata

`package.json` and the root package records in `package-lock.json` are synchronized at `1.2.0` on the release-preparation branch.

The lockfile synchronization was performed by a one-shot release-branch workflow and verified by reading the resulting lockfile. That temporary workflow was removed immediately afterward and is not part of the candidate architecture.

## Remaining release gates

Repository-level implementation, unit, upgrade/restore, dependency-gate, build, and Electron E2E validation are complete for the validated product head.

Still pending before publication:

- clean-profile consumer smoke on the actual packaged candidate, including one materially non-software career context;
- Windows NSIS x64 package build and runtime validation from the immutable candidate;
- macOS x64 and arm64 package build and runtime validation from the immutable candidate;
- Windows bundled-SQLite verification on the immutable package;
- signing/notarization evidence where credentials are available, or an explicit release-note limitation where unavailable;
- final GitHub Release asset inventory and spot-check;
- README/download-link and shipped-status transition only after the assets exist.

The connected desktop validation runner was offline during repository preparation, so no platform-local package or installer validation is claimed here.

## Publication boundary

Until publication completes:

- v1.1.2 remains the latest shipped release;
- README download links remain on v1.1.2;
- v1.2.0 remains a release candidate rather than shipped product;
- no v1.2.0 artifact should be presented as a completed release merely because a branch, version, or tag exists.

Final publication requires the expected Windows/macOS assets to be present on the GitHub Release and spot-checked from the actual release page.
