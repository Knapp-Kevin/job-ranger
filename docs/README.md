# Documentation Index

Job Ranger documentation is divided into current guidance, active design/research, validation evidence, and historical implementation records. This distinction matters because several early phase plans describe work that has since been completed or superseded.

## Current Sources of Truth

| Document | Purpose |
| --- | --- |
| [`../README.md`](../README.md) | Public product overview, current release, capabilities, setup, and roadmap. |
| [`../HELP.md`](../HELP.md) | User-facing setup and troubleshooting. |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Published release history and notable changes. |
| [`CONCEPT.md`](./CONCEPT.md) | Product intent, principles, boundaries, and success standard. |
| [`SYSTEM_STATE.md`](./SYSTEM_STATE.md) | Current factual repository/product snapshot. |
| [`ARCHITECTURE_PLAN.md`](./ARCHITECTURE_PLAN.md) | Current architecture and accepted intended evolution. |
| [`planning/PLAN.md`](./planning/PLAN.md) | Active roadmap and prioritized next work. |
| [`design/UNIVERSAL_USER_STORIES.md`](./design/UNIVERSAL_USER_STORIES.md) | Normative user-story product contract for cross-career universality and validation ownership. |
| [`BRANDING.md`](./BRANDING.md) | Canonical visual assets and brand usage. |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Required third-party attribution and independence/trademark boundaries. |
| [`../GOVERNANCE.md`](../GOVERNANCE.md) | Decision authority, status language, merge and release rules. |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributor workflow and quality expectations. |
| [`../SECURITY.md`](../SECURITY.md) | Security posture and reporting guidance. |

## Active Design and Research

- [`design/UNIVERSAL_USER_STORIES.md`](./design/UNIVERSAL_USER_STORIES.md) defines US-0 through US-30, issue ownership, progressive onboarding, target-track/constraint semantics, explainable opportunity assessment, and the cross-career validation model tracked by program issue #81.
- [`design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md`](./design/CAREER_EVIDENCE_RESUME_FUNCTIONAL_DESIGN.md) is the accepted implementation architecture for Career Evidence, provenance, requirement/evidence mapping, deterministic resume generation, truth/parseability/relevance gates, managed artifacts, and application-scoped resume versions.
- [`research/RESUME_INTELLIGENCE_QOR.md`](./research/RESUME_INTELLIGENCE_QOR.md) is the QOR research synthesis behind the Career Evidence and Resume Intelligence phase. It evaluates resume consumers, document formats, ATS/parser constraints, truthful tailoring, import provenance, Career-Ops lessons, and an evidence-first product model.
- [`research/RESUME_INTELLIGENCE_CATALOG_HARVEST.md`](./research/RESUME_INTELLIGENCE_CATALOG_HARVEST.md) applies the maintained Technical Capability Catalog to resume/import intelligence. It identifies permissively licensed candidates, rejects incompatible licensing paths, and records the bounded parser evaluation behind the adopted import path.
- [`research/JOB_RANGER_CAPABILITY_CATALOG_RECONCILIATION.md`](./research/JOB_RANGER_CAPABILITY_CATALOG_RECONCILIATION.md) reconciles the Technical Capability Catalog across Job Ranger's broader product surface: source discovery/acquisition, fit intelligence, applications, follow-up, interview preparation, notifications, inference, export, and security boundaries. Its central conclusion is to keep a native vertical product core and add only narrow replaceable adapters where a real external capability is needed.

Research documents provide supporting evidence and alternatives. `CONCEPT.md`, `ARCHITECTURE_PLAN.md`, `planning/PLAN.md`, and `design/UNIVERSAL_USER_STORIES.md` carry accepted direction; planned functionality is not claimed as shipped until implementation and release evidence exists.

## Validation Evidence

- [`windows-package-validation.md`](./windows-package-validation.md) records the Windows self-contained SQLite packaging proof used to close the v1.1.x release blocker and issue #38.

Cross-career user-story validation is tracked by issue #87 and should become version-controlled evidence as the Universal User Stories program is implemented.

## Current Documentation Baseline

The current documentation baseline reflects:

- Career Profile and deterministic fit guidance on `main`;
- durable Career Profile and Applications persistence on `main`;
- Career Evidence import/review and requirement mapping on `main`;
- deterministic resume creation and artifact lifecycle on `main` through PR #75;
- occupation-agnostic Career Profile behavior;
- the Universal User Stories program tracked by #81 and design issues #82-#88;
- Career-Ops attribution preserved without embedding its runtime;
- Node.js 22.12+, Electron 44.4.5, Vite 8, and TypeScript 7;
- Windows x64 and macOS x64/arm64 v1.1.2 published packaging.

## Historical Planning Records

The following files are retained for implementation provenance but should not be used as current product status:

- `plan-remediation.md`
- `plan-v1-remediation.md`
- `plan-final-remediation.md`
- `plan-phase2-api-adapters.md`
- `plan-phase3-salary-extraction.md`
- `plan-phase4-caching-circuit-breaker.md`
- `planning/plan-phase5-notifications-tray.md`
- `planning/plan-phase5-notifications-tray-v2.md`

These documents are useful for understanding how the current implementation was reached. Where they conflict with the root README, `SYSTEM_STATE.md`, current source, tests, or a published release, the newer evidence wins.

## Internal Provenance Artifacts

`META_LEDGER.md` and `SHADOW_GENOME.md` are retained as internal project/provenance artifacts. They are not intended as end-user product documentation and should not override current source or governance documents.

## Documentation Rule

When product behavior changes, update the smallest set of current source-of-truth documents needed to keep public claims accurate. Do not rewrite historical documents merely to make the past look tidy. History is allowed to be historical. Miracles occur.
