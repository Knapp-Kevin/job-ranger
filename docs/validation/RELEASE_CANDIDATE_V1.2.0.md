# Job Ranger v1.2.0 Release Candidate Evidence

**Status:** preparation in progress  
**Target version:** v1.2.0  
**Published predecessor:** v1.1.2  
**Preparation branch:** `release/v1.2.0-rc1`  
**Candidate base:** `main@20c8d776fe629d5310c486a6496f2b1af07d88c0`  
**Preparation date:** 2026-10-04

## Scope decision

v1.2.0 is the selected next release version.

The release is a minor-version increment because it adds substantial backward-compatible product capability without intentionally resetting the user-data model or introducing a governed breaking product contract.

The candidate scope is frozen around the completed post-v1.1.2 product plus accepted repository hardening already merged to `main`.

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

## Security disposition still required

### #123 DNS-rebinding connection pinning

Current automated acquisition validates URL syntax, rejects private/loopback/link-local/reserved destinations, resolves hostname targets before requests, and validates redirects. Browser-backed requests are also preflighted through the acquisition network policy.

The remaining issue is a time-of-check/time-of-use gap: the transport can perform a later DNS resolution when the actual Node or Chromium connection is established. A hostile hostname capable of DNS rebinding could theoretically return a public address during policy validation and a private address during connection establishment.

This release candidate must not describe the current implementation as connection-pinned or rebinding-proof.

Before publication, #123 requires one of these governed outcomes:

1. implement and validate connection-level pinning/equivalent protection; or
2. explicitly accept the residual risk for v1.2.0 with documented rationale and user/security documentation that does not overclaim the boundary.

This item is a release-gate decision for #119.

## Validation evidence already available

Fresh evidence immediately before the hardening tranche includes:

- PR #114: repository health and full Electron E2E green on its final head;
- PR #115: repository-health validation green for the universal-user-story closeout;
- version-controlled validation artifacts under `docs/validation/` for Career Evidence, cross-career fixtures, discovery, portability, and documentation reconciliation.

The QOR hardening tranche changed privileged/runtime code after that evidence. Therefore the release candidate requires a fresh complete validation run rather than reusing pre-hardening green status as though nothing changed.

## Required candidate validation

Pending on the frozen candidate:

```text
npm ci
npm run typecheck
npm run build
npm run test
npm run test:unit
npm run test:e2e
```

Also pending:

- current dependency/security audit review;
- representative v1.1.2 -> v1.2.0 upgrade/migration exercise;
- backup creation/validation before destructive upgrade testing;
- restore into a different data root with managed-path rebasing;
- clean-profile consumer smoke, including one materially non-software career context;
- Windows NSIS x64 immutable-tag package validation;
- macOS x64 and arm64 immutable-tag package validation;
- signing/notarization evidence where credentials are available, or an explicit release-note limitation where unavailable.

No pending item should be marked passed without execution evidence.

## Version metadata

`package.json` is staged as `1.2.0` on the release-preparation branch.

`package-lock.json` still contains the previous root-package version and must be reconciled before the release-preparation PR can merge. The candidate must not be tagged with mismatched package metadata.

## Publication boundary

Until publication completes:

- v1.1.2 remains the latest shipped release;
- README download links remain on v1.1.2;
- `docs/SYSTEM_STATE.md` must continue to describe post-v1.1.2 capabilities as implemented on `main`, not shipped;
- no v1.2.0 artifact should be presented as a completed release merely because a branch, version, or tag exists.

Final publication requires the expected Windows/macOS assets to be present on the GitHub Release and spot-checked from the actual release page.
