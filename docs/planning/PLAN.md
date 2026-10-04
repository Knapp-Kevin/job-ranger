# Job Ranger Roadmap

**Current as of:** 2026-10-03

This is the active roadmap. Historical phase/remediation plans remain implementation provenance only.

## North Star

Job Ranger should help a job seeker:

1. find useful opportunities;
2. understand which deserve attention;
3. prepare truthful application materials;
4. track applications and what happened;
5. prepare for the next step;
6. learn from the search without turning the search itself into another job.

Core functionality must remain useful without remote inference.

The universal product contract remains:

> **US-0:** As a job seeker, I want Job Ranger to adapt to the way my career works without requiring me to understand how Job Ranger works.

See [`../design/UNIVERSAL_USER_STORIES.md`](../design/UNIVERSAL_USER_STORIES.md).

## Current release boundary

The latest published installers remain **v1.1.2**.

`main` is materially ahead and contains the completed Career Evidence/Resume Intelligence program, the completed Universal User Stories program, and the broader application lifecycle/portability work described in `CHANGELOG.md` under **Unreleased**.

The highest-priority product-delivery task is now to prepare and publish a fully validated release rather than adding another large subsystem first.

## Completed programs

### Career Evidence and Resume Intelligence / #59

**Status: complete on `main`.**

- [x] R0 durable Career Profile/Application persistence and Career Evidence foundation;
- [x] R1 local resume import, source preservation, extraction snapshots, evidence review, and provenance;
- [x] R2 explicit job requirements and requirement ↔ Career Evidence mapping;
- [x] R3 deterministic resume creation, Truth Gate, Parseability Gate, artifact/version lifecycle;
- [x] R4 deterministic target-specific tailoring with preserved evidence lineage;
- [x] R5 application lifecycle, Career Stories, interview prep, application materials, offers, Search Insights, backup/restore, and JSON Resume interoperability.

Optional remote inference was not required to complete R4/R5 and remains deferred.

### Universal User Stories / #81

**Status: complete on `main`.**

- [x] progressive onboarding;
- [x] multiple Target Tracks;
- [x] required/preferred/target semantics;
- [x] broad Career Evidence representation;
- [x] structured credentials and schedule constraints;
- [x] consumer source discovery with explicit source approval;
- [x] explainable opportunity assessment;
- [x] downstream resume/application/interview/lifecycle stories;
- [x] cross-career fixture/validation matrix;
- [x] US-0 through US-30 reconciliation.

Narrower fields/capabilities that did not earn core placement remain deferred rather than being forced into the universal model.

## Active priority 0: documentation and release readiness

### Platinum documentation remediation / #116

- [ ] reconcile README, HELP, CHANGELOG, SYSTEM_STATE, architecture, roadmap, governance, and security with current `main`;
- [ ] make shipped vs implemented-on-main status unmistakable;
- [ ] add durable release-readiness contract;
- [ ] record product-gap dispositions;
- [ ] run manual validation without consuming GitHub Actions budget;
- [ ] convert genuine gaps into follow-on issues.

### Next release

Before publication:

- [ ] select the next version deliberately;
- [ ] validate upgrade/migrations from v1.1.2;
- [ ] validate backup/restore before destructive migration/package testing;
- [ ] run repository health and Electron workflow validation manually or through the chosen release environment;
- [ ] repeat Windows package validation on the immutable release tag;
- [ ] repeat macOS x64/arm64 packaging validation on the immutable release tag;
- [ ] record notarization evidence when credentials are available;
- [ ] publish Windows/macOS assets;
- [ ] finalize release notes, README download links, and shipped-state docs only after assets exist.

See [`../RELEASE_READINESS.md`](../RELEASE_READINESS.md).

## Active priority 1: source truth and reliability

These are the strongest product gaps discovered during the October 2026 capability review.

### Canonical job-description/source snapshots

**Need:** preserve fuller source/job-description evidence so requirement mapping, interview prep, and historical application context do not depend solely on partial text collected during one scrape.

Acceptance direction:

- preserve complete/bounded source text where the source permits it;
- record retrieval time/source identity/extraction version;
- retain historical posting context after a listing disappears;
- distinguish “not found in collected text” from “not required by employer”;
- do not store arbitrary executable page state merely to call it a snapshot.

### Dynamic-source diagnostics and reliability

**Need:** improve Workday/iCIMS/BambooHR/Oracle/Taleo/generic browser-backed reliability and make failure states understandable.

Acceptance direction:

- distinguish no-results, unsupported shape, access block, timeout, parse failure, and network-policy rejection;
- improve pagination/infinite-load handling only where measured value justifies it;
- collect local diagnostic evidence by source family without creating telemetry;
- preserve the acquisition network/security boundary.

## Priority 2 candidates: evaluate before implementation

See [`../PRODUCT_GAP_REVIEW.md`](../PRODUCT_GAP_REVIEW.md) for full disposition rationale.

### Broader opportunity discovery

Candidate source classes:

- federal/USAJOBS;
- state/local government;
- school districts;
- hospitals/health systems;
- academic/professional associations;
- apprenticeship/union sources;
- staffing/contract marketplaces;
- broader general feeds.

Do not require ordinary users to configure developer/API credentials merely to use the product.

### Faster arbitrary-job capture

First evaluate a native paste/open-URL capture flow. Build a browser extension only if it provides material additional value worth the maintenance/security surface.

### Reusable application-question answers

Candidate model:

- preserve exact question text;
- reuse user-authored approved answers;
- link factual assertions to Career Evidence where applicable;
- require review before reuse;
- never auto-submit.

### User-controlled application form assistance

Potentially valuable, but high-governance. Autofill is not the same as auto-apply. Any implementation must keep the user in control of every submission and use confirmed evidence for factual fields.

### Networking workspace

Current application-scoped contacts may prove sufficient. Promote broader networking CRM only if real use demonstrates cross-application/company relationship management is missing.

### Calendar mirroring

Job Ranger remains authoritative. A future calendar adapter may mirror selected interviews/deadlines/follow-ups but must not silently mutate lifecycle history.

### Mock interview practice

Deterministic grounded prep already exists. Conversational practice/feedback is a candidate enhancement, with remote inference/audio privacy reviewed separately.

## Deferred

Do not schedule these without new evidence:

- remote inference provider;
- OCR for scanned/image-only resumes;
- DOCX resume export;
- federal-resume/academic-CV specialized projections;
- universal travel/relocation/sponsorship fields;
- cloud sync / hosted account;
- Linux packaged distribution.

## Explicit non-goals under current governance

- autonomous mass auto-apply;
- recruiter-facing ATS/team workspace;
- opaque hiring-probability or proprietary ATS score presented as truth;
- generic agent framework/runtime;
- generic workflow engine;
- vector database without measured need;
- agent-memory platform;
- managed browser platform as the default architecture;
- noncommercial/share-alike template assets inside the MIT product.

These can change only through an explicit evidence-backed governance decision, not through architectural drift.

## Architecture invariants for future work

1. Career Evidence remains factual authority.
2. Goal/intent does not become factual evidence.
3. Preference does not silently become constraint.
4. Inference may propose but may not establish truth.
5. Consequential source/application changes require user authority.
6. No autonomous mass application.
7. Unknown information stays unknown.
8. Core workflows remain useful without remote inference.
9. Application materials trace to confirmed evidence.
10. Search learning proposes strategy changes; it does not silently mutate profile/evidence.
11. Occupation knowledge is bounded data/rules before plugin/runtime complexity.
12. External services remain adapters, not domain authorities.

## Historical plans

Earlier `plan-*.md` files remain for provenance only. They should not be used to infer current status. The current documentation authority hierarchy is in [`../README.md`](../README.md).
