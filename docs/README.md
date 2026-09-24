# Documentation Index

Job Ranger documentation is divided into current guidance, validation evidence, and historical implementation records. This distinction matters because several early phase plans describe work that has since been completed or superseded.

## Current Sources of Truth

| Document | Purpose |
| --- | --- |
| [`../README.md`](../README.md) | Public product overview, current release, capabilities, setup, and roadmap. |
| [`../HELP.md`](../HELP.md) | User-facing setup and troubleshooting. |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Published release history and notable changes. |
| [`CONCEPT.md`](./CONCEPT.md) | Product intent, principles, boundaries, and success standard. |
| [`SYSTEM_STATE.md`](./SYSTEM_STATE.md) | Current factual repository/product snapshot. |
| [`ARCHITECTURE_PLAN.md`](./ARCHITECTURE_PLAN.md) | Current architecture and intended evolution. |
| [`planning/PLAN.md`](./planning/PLAN.md) | Active roadmap and prioritized next work. |
| [`BRANDING.md`](./BRANDING.md) | Canonical visual assets and brand usage. |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Required third-party attribution and independence/trademark boundaries. |
| [`../GOVERNANCE.md`](../GOVERNANCE.md) | Decision authority, status language, merge and release rules. |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributor workflow and quality expectations. |
| [`../SECURITY.md`](../SECURITY.md) | Security posture and reporting guidance. |

## Validation Evidence

- [`windows-package-validation.md`](./windows-package-validation.md) records the Windows self-contained SQLite packaging proof used to close the v1.1.x release blocker and issue #38.

These documents record specific verification evidence. They do not replace the current product/state documentation above.

## v1.1.x Documentation Baseline

The current documentation baseline reflects:

- Career Profile and deterministic fit guidance on `main`;
- Applications tracking on `main`;
- Career-Ops attribution preserved without embedding its runtime;
- Node.js 22.12+, Electron 44.4.5, Vite 8, and TypeScript 7;
- the completed coordinated modernization formerly tracked by issue #38;
- Windows x64 and macOS x64/arm64 release packaging;
- the explicit transitional persistence boundary for Career Profile and Applications.

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
