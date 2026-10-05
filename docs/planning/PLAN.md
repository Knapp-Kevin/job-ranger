# Job Ranger Roadmap

**Current as of:** 2026-10-05

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

Stable **v1.2.0** was published on 2026-10-05 from commit:

`71f9b790a1f456321aee2c783f39f4a6784b83a9`

The release was promoted byte-for-byte from validated `v1.2.0-rc.5` artifacts. Its Windows/macOS packages are intentionally unsigned/unnotarized under the documented owner-approved exception and remain immutable historical release artifacts.

Post-v1.2 work no longer assumes that Job Ranger must purchase/maintain both Windows public-trust signing and Apple Developer credentials. The accepted forward distribution architecture is:

- **cross-platform mainstream:** local-first PWA/web runtime;
- **Windows-native mainstream:** Microsoft Store packaged Electron application;
- direct GitHub native binaries: development/testing/advanced use unless independently publicly trusted;
- no planned native macOS or Linux distribution;
- SignPath excluded;
- Azure Artifact Signing optional rather than release-critical.

See [`../design/DISTRIBUTION_ARCHITECTURE.md`](../design/DISTRIBUTION_ARCHITECTURE.md) and [`../DISTRIBUTION_TRUST.md`](../DISTRIBUTION_TRUST.md).

## Completed programs

### Career Evidence and Resume Intelligence / #59

**Status: complete.**

- [x] R0 durable Career Profile/Application persistence and Career Evidence foundation;
- [x] R1 local resume import, source preservation, extraction snapshots, evidence review, and provenance;
- [x] R2 explicit job requirements and requirement ↔ Career Evidence mapping;
- [x] R3 deterministic resume creation, Truth Gate, Parseability Gate, artifact/version lifecycle;
- [x] R4 deterministic target-specific tailoring with preserved evidence lineage;
- [x] R5 application lifecycle, Career Stories, interview prep, application materials, offers, Search Insights, backup/restore, and JSON Resume interoperability.

Optional remote inference was not required to complete R4/R5 and remains deferred.

### Universal User Stories / #81

**Status: complete.**

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

### v1.2.0 release / #119

**Status: complete.**

- [x] immutable release candidate lineage;
- [x] Windows/macOS package smoke;
- [x] checksum and schema-v2 manifest evidence;
- [x] stable v1.2.0 publication;
- [x] post-release documentation reconciliation.

The unsigned/unnotarized v1.2.0 exception does not define the future distribution architecture.

## Active priority 0: distribution architecture implementation

### Windows Microsoft Store / #125

Build the primary supported Windows-native distribution path using the Microsoft Store.

Implementation direction:

- [ ] produce an AppX proof-of-concept with the pinned Electron/electron-builder v26 toolchain;
- [ ] configure Partner Center publisher/package identity;
- [ ] validate manifest/capability generation;
- [ ] validate packaged SQLite and local artifact paths;
- [ ] validate source acquisition, resume import/export/PDF generation, and backup/restore;
- [ ] validate upgrade/coexistence/migration from historical direct installer where relevant;
- [ ] pass Store certification;
- [ ] validate clean Windows install and first launch from the Store;
- [ ] make Microsoft Store the recommended Windows-native installation path.

Do not block this work on Azure Artifact Signing.

### Cross-platform local-first PWA / #130

Evolve Job Ranger toward a shared domain/application core with a first-class web/PWA runtime.

Implementation direction:

- [ ] inventory Electron-only and Node-only assumptions;
- [ ] define shared-core versus runtime-adapter boundaries;
- [ ] select/prove browser persistence using OPFS/IndexedDB or an evidence-backed alternative;
- [ ] preserve domain identity, provenance, lineage, migrations, and backup semantics;
- [ ] prove resume/Career Evidence import and deterministic output boundaries;
- [ ] prove one end-to-end local-first Career Ops workflow in the browser runtime;
- [ ] implement safe service-worker update/recovery behavior;
- [ ] validate storage quota/eviction behavior and user-facing backup guidance;
- [ ] validate installability/standalone behavior across supported browsers;
- [ ] document genuine native-only limitations rather than inheriting Electron assumptions by accident;
- [ ] promote the PWA only after capability and trust evidence is recorded.

The PWA is not intended to become a permanently reduced "Lite" edition.

## Active priority 1: source discovery and quality

### Post-v1.2 provider tranche / #136

Implement or evidence-reject the first bounded post-v1.2 provider tranche:

- Himalayas;
- We Work Remotely.

Requirements include first-party terms/attribution verification, deterministic normalization, provenance, explicit coverage limitations, duplicate-rate measurement, and material unique coverage rather than listing-count inflation.

ReliefWeb remains a later niche candidate subject to registration and terms/IP review.

### Source truth and reliability

Continue to preserve and improve:

- canonical source/job-description snapshots;
- full/partial/listing-only completeness semantics;
- dynamic-source diagnostics;
- acquisition failure isolation;
- connection-level DNS rebinding protections;
- honest unsupported/unavailable states.

## Priority 2 candidates: evaluate before implementation

See [`../PRODUCT_GAP_REVIEW.md`](../PRODUCT_GAP_REVIEW.md) for full disposition rationale.

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
- native macOS distribution;
- native Linux distribution;
- Apple Developer ID/notarization;
- Azure Artifact Signing as a required release dependency.

## Explicitly rejected under current distribution architecture

- SignPath as a Job Ranger signing/distribution dependency.

Changing this disposition requires a new explicit architecture decision.

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
13. Browser delivery does not make personal career data server-authoritative.
14. Runtime adapters do not become product/domain authorities.
15. Public code-signing certificates are optional tools, not foundational release dependencies.

## Historical plans

Earlier `plan-*.md` files remain for provenance only. They should not be used to infer current status. The current documentation authority hierarchy is in [`../README.md`](../README.md).
