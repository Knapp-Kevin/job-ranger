<p align="center">
  <img src="docs/assets/branding/job-ranger-banner.png" alt="Job Ranger - Find Your Next Opportunity" width="100%" />
</p>

# Job Ranger

<p align="center">
  <strong>A local-first Career Ops companion for understanding where you want to go, finding the right paths to employment, preparing truthful materials, and managing a focused search without turning your career into somebody else's cloud product.</strong>
</p>

<p align="center">
  <a href="https://github.com/Knapp-Kevin/job-ranger/releases/tag/v1.1.2"><img src="https://img.shields.io/badge/published%20release-v1.1.2-0f172a.svg" alt="Published release v1.1.2" /></a>
  <img src="https://img.shields.io/badge/main-materially%20ahead-2563eb.svg" alt="Main materially ahead of published release" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-2563eb.svg" alt="Windows and macOS" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-15803d.svg" alt="MIT License" /></a>
</p>

## Release status

**The latest published installers are still v1.1.2.** They were published on September 24, 2026 and contain the first consumer-oriented Career Profile, deterministic fit guidance, Applications tracking, source monitoring, filters, notifications, and the Windows/macOS packaging fixes from the v1.1 line.

**`main` is now a substantially newer product than v1.1.2.** The default branch contains the completed Career Evidence / Resume Intelligence program, Universal User Stories program, and broader application-lifecycle work. Those capabilities are implemented and validated in the repository, but they are **not shipped to normal users until a new GitHub Release is published**.

That distinction is deliberate. Job Ranger uses these status terms consistently:

| Status | Meaning |
| --- | --- |
| **Shipped** | Present in a published GitHub Release that users can download. |
| **Implemented on main** | Merged into the default branch, but not necessarily present in the latest installer. |
| **Candidate / next** | Evidence-backed possible next work, not a product commitment. |
| **Deferred** | Intentionally not active, with a recorded reason. |
| **Historical** | Retained for provenance only. |

For exact current repository state, see [`docs/SYSTEM_STATE.md`](./docs/SYSTEM_STATE.md). For release-readiness requirements, see [`docs/RELEASE_READINESS.md`](./docs/RELEASE_READINESS.md).

## Install the current published release

Normal users do not need Git, Node.js, npm, SQLite, a terminal, or an AI account.

### Windows

**[Download Job Ranger v1.1.2 for Windows x64 (.exe)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.2/Job.Ranger-v1.1.2-windows-x64.exe)**

The Windows installer includes the SQLite runtime Job Ranger needs.

### macOS

- **[Apple Silicon / M-series Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.2/Job.Ranger-v1.1.2-macos-arm64.dmg)**
- **[Intel Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.2/Job.Ranger-v1.1.2-macos-x64.dmg)**

See the [latest GitHub Release](https://github.com/Knapp-Kevin/job-ranger/releases/latest) before downloading. Linux does not currently have a supported packaged release.

## What Job Ranger is

Job searching contains an absurd amount of clerical work. People repeatedly check the same sources, lose track of opportunities, rewrite the same career facts, forget which resume they submitted, and maintain increasingly haunted collections of tabs, notes, spreadsheets, and half-finished documents.

But Job Ranger is not trying to make that machinery spin faster. It is designed around **quality over quantity**: understanding the person behind the resume, identifying career directions worth pursuing, finding companies and opportunities that fit those directions, and helping the user choose a useful path to employment rather than maximizing application throughput.

The guiding progression is:

> **Person → Career Direction → Companies → People → Opportunities → Applications**

A user may enter anywhere in that chain. The resume is useful evidence about prior work, not a command to keep repeating it and not the sole definition of who the user is.

Job Ranger is designed to make the workflow coherent while preserving user authority:

1. describe what kind of work, environment, constraints, and direction you actually want;
2. build a factual Career Evidence record from a resume or direct entry;
3. discover and monitor employers, sources, and opportunities that fit those directions;
4. assess which opportunities genuinely deserve attention using explicit requirements, evidence, constraints, preferences, and unknowns;
5. prepare evidence-backed resumes and application materials for opportunities the user intentionally chooses to pursue;
6. track the exact materials, people, events, reminders, interviews, offers, and outcomes around each application;
7. learn from recurring gaps and observed results without pretending correlation is destiny or application count is progress;
8. keep the core workflow local and useful without an AI provider.

Broader Career Ops capabilities such as company targeting and relationship-path discovery are candidate directions, not current-product claims. They are governed separately so networking does not become yet another automated spam surface.

Job Ranger does **not** autonomously apply to jobs, invent qualifications or relationships, silently transmit career data to an inference provider, optimize for raw application volume, or treat a single opaque score as hiring truth.

## Capability map

The table below intentionally separates what normal users can download today from what is already implemented on `main`.

| Capability | Published v1.1.2 | Current `main` |
| --- | --- | --- |
| Electron desktop app, local SQLite job/source state | **Shipped** | **Implemented** |
| Structured ATS adapters: Greenhouse, Lever, SmartRecruiters, Ashby | **Shipped** | **Implemented** |
| Browser/generic acquisition for other career sites | **Shipped, best effort** | **Implemented, hardened** |
| Career Profile | **Shipped** | **Implemented, durable SQLite authority** |
| Applications statuses and notes | **Shipped** | **Implemented, durable SQLite authority** |
| Progressive onboarding | Not shipped | **Implemented on main** |
| Multiple target tracks and hard/preferred/target semantics | Not shipped | **Implemented on main** |
| Career Evidence import and direct authoring | Not shipped | **Implemented on main** |
| Resume import from DOCX, text-bearing PDF, plain text, pasted text | Not shipped | **Implemented on main** |
| Evidence provenance, correction, references, and supersede lineage | Not shipped | **Implemented on main** |
| Structured credentials and schedule constraints | Not shipped | **Implemented on main** |
| Consumer source discovery with explicit approval | Not shipped | **Implemented on main, partial provider coverage** |
| Explainable opportunity assessment | Basic fit score shipped | **Eligibility, evidence, track, preferences, blockers, unknowns** |
| Deterministic resume creation and PDF validation | Not shipped | **Implemented on main** |
| Target-specific deterministic resume tailoring | Not shipped | **Implemented on main** |
| Exact submitted resume history | Not shipped | **Implemented on main** |
| Contacts, milestones, reminders, follow-ups | Not shipped | **Implemented on main** |
| Career Stories | Not shipped | **Implemented on main** |
| Evidence-grounded interview preparation | Not shipped | **Implemented on main** |
| Evidence-grounded application materials / cover-letter projection | Not shipped | **Implemented on main** |
| Offer / negotiation state | Not shipped | **Implemented on main** |
| Search Insights and recurring-gap analysis | Not shipped | **Implemented on main** |
| Verified backup / staged restore | Not shipped | **Implemented on main** |
| JSON Resume import/export | Not shipped | **Implemented on main** |
| Remote inference provider | Not shipped | **Deferred; core product does not require it** |
| OCR for scanned/image-only resumes | Not shipped | **Deferred pending evidence-backed demand** |
| DOCX resume export | Not shipped | **Deferred pending evidence-backed demand** |
| Career Ops relationship-path discovery | Not shipped | **Candidate; tracked in #121** |
| Autonomous mass auto-apply | Not shipped | **Explicit non-goal** |
| Linux installer | Not shipped | **Undecided / unsupported** |

## Core product principles

### Quality over quantity

Job Ranger is not Job Gatling Gun.

The product should optimize for **qualified, intentional progress**, not applications sent. A smaller number of well-understood opportunities that fit the user's direction, evidence, constraints, and preferences is preferable to a large queue of weak matches.

Automation should reduce clerical burden and the cost of making good decisions. It should not remove the user's judgment from consequential external actions or convert employers and professional networks into targets for automated volume.

### Career Evidence is factual authority

Career Profile and Target Tracks describe intent. Career Evidence describes what is factually true about the user. Imported information begins as a proposal. Only user-confirmed or user-authored evidence can support factual application claims.

### Preferences are not constraints

Remote preference, compensation target, commute, schedule, employment arrangement, and similar choices retain explicit semantics. A preference does not silently become a blocker.

### Explain uncertainty instead of scoring around it

Current `main` separates eligibility, evidence coverage, career-track alignment, preference alignment, blockers, and unknowns. Missing job data stays missing instead of being converted into fake precision.

### Local first, useful before AI

The core workflow works without an AI account or hosted Job Ranger account. Optional external capabilities must be narrow adapters with explicit disclosure and may not become authorities over career truth.

### User authority

Job Ranger can discover, organize, explain, prepare, remind, preserve, and analyze. Consequential external actions remain with the user.

## Source support model

Job Ranger does not pretend every careers site is equally automatable.

| Support level | Meaning |
| --- | --- |
| `supported` | A structured adapter exists and is the preferred path. |
| `detected` | Job Ranger recognizes the portal and can attempt generic/browser extraction. |
| `browser-required` | A constrained rendered-browser path is required. |
| `manual-review` | No reliable automated acquisition path is claimed. |

Current structured adapters are Greenhouse, Lever, SmartRecruiters, and Ashby. Workday, iCIMS, BambooHR, Taleo, Oracle Careers, Microsoft Careers, and generic career pages use detected or browser-backed paths where applicable.

Source discovery is deliberately separate from source acquisition. A discovered opportunity or employer is not silently converted into a monitored trusted source. The user approves monitoring explicitly.

## Current architecture

```text
React renderer
  Home / onboarding / jobs / applications
  Career Profile / Career Evidence / Career Stories
  Target Tracks / Resume / Search Insights
  Companies / Filters / Settings
          │
          ▼ typed preload / IPC
Electron main process
  Job acquisition and source monitoring
  Career Profile / Career Evidence / provenance
  Target Tracks / requirements / assessment
  Resume projection, Truth Gate, PDF + Parseability Gate
  Application lifecycle / interview prep / materials
  Career Stories / Search Insights / offers
  Backup + staged restore / JSON Resume adapter
          │
          ▼
        SQLite + managed local artifacts
```

`electron/src/**` is the only checked-in privileged implementation authority. `electron-runtime/**` is generated for development, tests, packaging, and execution. See [`docs/BUILD_RUNTIME.md`](./docs/BUILD_RUNTIME.md) and [`docs/ARCHITECTURE_PLAN.md`](./docs/ARCHITECTURE_PLAN.md).

## Privacy and security posture

Current `main` keeps structured career/search state locally and uses typed IPC boundaries rather than exposing Node.js directly to the renderer. The main window and specialized browser/render surfaces are sandboxed as appropriate; Node integration is disabled; context isolation and web security remain enabled; external URLs are validated; automated acquisition applies public-network restrictions rather than blindly following redirects into local/private address space.

Remote inference, telemetry, cloud account sync, or credential-bearing external services require explicit future governance and disclosure. See [`SECURITY.md`](./SECURITY.md).

## Product gaps and evaluated candidates

The current product is broad, but “zero open issues” is not treated as evidence that no ideas remain. A current capability-gap review lives in [`docs/PRODUCT_GAP_REVIEW.md`](./docs/PRODUCT_GAP_REVIEW.md).

Examples under active consideration or explicit disposition include:

- broader source-discovery coverage, including government and niche sources;
- easier capture of jobs encountered in the browser;
- reusable application-question answers and limited user-controlled form assistance;
- richer Career Ops networking and relationship-path workflows beyond application-scoped contacts;
- company targeting and monitoring before a specific opening exists;
- mock interview practice and answer-feedback workflows;
- calendar integration;
- canonical full job-description preservation where source capabilities permit it;
- source reliability improvements for dynamic portals;
- Linux packaging.

Issue [#121](https://github.com/Knapp-Kevin/job-ranger/issues/121) tracks the Career Ops relationship-path and intentional-pursuit design work. These are candidates, not promises. Features are evaluated against Job Ranger's privacy, evidence, maintainability, quality-over-quantity, and user-authority principles before they become roadmap work.

## Development

Normal users should use published installers. The following is for repository development.

### Prerequisites

- Node.js `>=22.12.0`
- npm
- `sqlite3` on `PATH`, or `SQLITE3_PATH` set explicitly

### Core commands

```bash
npm ci
npm run repo:health
npm run test:unit
npm run test:e2e
npm run electron:dev
npm run electron:build:win
npm run electron:build:mac
```

This repository deliberately preserves GitHub Actions budget for work that actually needs hosted execution. Documentation/remediation validation may be performed manually by the maintainer and recorded in the relevant PR or release evidence. Do not equate “no Actions run” with “no validation.”

## Release engineering

Published GitHub Releases are the source of truth for user-installable builds. The next release must pass the release-readiness contract in [`docs/RELEASE_READINESS.md`](./docs/RELEASE_READINESS.md), including:

- documentation reconciliation;
- migration/backup compatibility checks;
- dependency/security review;
- repository-health and Electron workflow validation;
- Windows package validation with bundled SQLite;
- macOS x64/arm64 packaging validation and notarization evidence when credentials are available;
- release notes that describe the actual immutable tag.

The current `package.json` version remains `1.1.2` until release preparation deliberately selects and stages the next version.

## Documentation hierarchy

Start with [`docs/README.md`](./docs/README.md). Current sources of truth are intentionally separated from historical implementation plans and research evidence.

## Governance, security, and attribution

- [`GOVERNANCE.md`](./GOVERNANCE.md) — decision authority and truth/status language.
- [`SECURITY.md`](./SECURITY.md) — security posture and reporting guidance.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow.
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — community expectations.
- [`docs/BRANDING.md`](./docs/BRANDING.md) — canonical visual assets and usage.
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) — required third-party attribution and provenance.

## License

Job Ranger is open source under the [MIT License](./LICENSE). Third-party dependencies and adapted components retain their own obligations as recorded in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
