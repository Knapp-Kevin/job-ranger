<p align="center">
  <img src="docs/assets/branding/job-ranger-banner.png" alt="Job Ranger - Find Your Next Opportunity" width="100%" />
</p>

# Job Ranger

<p align="center">
  <strong>A local-first desktop job-search companion for finding opportunities, understanding fit, and tracking the search without turning your career into somebody else's cloud product.</strong>
</p>

<p align="center">
  <a href="https://github.com/Knapp-Kevin/job-ranger/releases/tag/v1.1.1"><img src="https://img.shields.io/badge/release-v1.1.1-0f172a.svg" alt="Release v1.1.1" /></a>
  <a href="https://github.com/Knapp-Kevin/job-ranger/actions/workflows/ci.yml"><img src="https://github.com/Knapp-Kevin/job-ranger/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-2563eb.svg" alt="Windows and macOS" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-15803d.svg" alt="MIT License" /></a>
</p>

## Install Job Ranger

**Normal users do not need Git, Node.js, npm, SQLite, a terminal, or an AI account.** Download the desktop build for your computer and run it.

### Windows

**[Download Job Ranger v1.1.1 for Windows x64 (.exe)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.1/Job.Ranger-v1.1.1-windows-x64.exe)**

1. Download the `.exe` file.
2. Open it.
3. Follow the Windows prompts and launch **Job Ranger**.

The Windows installer is self-contained for Job Ranger's SQLite runtime. You do not need to install `sqlite3` separately.

### macOS

Choose the build that matches your Mac:

- **[Apple Silicon / M-series Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.1/Job.Ranger-v1.1.1-macos-arm64.dmg)**
- **[Intel Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.1.1/Job.Ranger-v1.1.1-macos-x64.dmg)**

Open the downloaded `.dmg`, move Job Ranger into **Applications** if prompted, then launch it normally. If you are unsure which Mac you have, open **Apple menu → About This Mac** and look for either an Apple M-series chip or an Intel processor.

Prefer to inspect the release first? See the [latest Job Ranger release](https://github.com/Knapp-Kevin/job-ranger/releases/latest).

## Start Using It

Job Ranger v1.1.1 includes the consumer-oriented Career Intelligence workflow introduced in the v1.1 line:

1. Open **Career Profile** and enter the roles, location, pay floor, skills, and credentials that are true for you.
2. Open **Companies** and add employer career pages you want Job Ranger to monitor.
3. Run a scrape or let Job Ranger check configured sources on schedule.
4. Open **Find Jobs** to review listings and see deterministic fit guidance based on your saved profile and the job data Job Ranger actually collected.
5. Choose **Track this job** for anything worth following.
6. Use **Applications** to track Interested, Applied, Interview, Offer, Rejected, or Withdrawn status and keep notes.
7. Use **Filters** to tune title, keyword, salary, and location signal.
8. Use **Settings** for notifications, scrape behavior, themes, and tray behavior.

For user-facing troubleshooting, see [HELP.md](./HELP.md).

## Status

**Job Ranger v1.1.1 is the current release.** It combines the established local career-page monitor with native Career Profile, deterministic fit guidance, and application tracking, and it corrects the Windows packaging defect found during the v1.1.0 release run.

The application remains local first and useful without inference. Career Profile, deterministic fit guidance, application tracking, scraping, filters, and notifications do not require an AI provider. Optional inference may enrich future guidance, but it is not the key that opens the product.

## What Changed in v1.1.1

- Made the Windows installer self-contained by bundling the official SQLite 3.53.4 x64 command-line runtime used by Job Ranger's desktop backend.
- Added packaged-runtime resolution so Windows prefers the bundled `sqlite3.exe` before host `PATH`.
- Hardened the Windows release supply chain by pinning the official SQLite tools archive and verifying its published SHA3-256 before extraction.
- Added release validation that proves the packaged SQLite binary exists, executes, and is selected by the runtime resolver with `SQLITE3_PATH` removed.
- Standardized the published Windows artifact on the NSIS installer target.
- Added explicit SQLite provenance to `THIRD_PARTY_NOTICES.md` and durable Windows packaging evidence under `docs/`.

v1.1.1 supersedes v1.1.0 as the first complete Windows + macOS release of the v1.1 feature line.

## What Changed in v1.1.0

- Added **Career Profile** onboarding, including an HVAC-friendly starter that never invents skills, licenses, or certifications.
- Added deterministic **job-fit scoring and plain-language fit guidance** using only saved profile data and collected listing evidence.
- Added a local **Applications** workspace with status tracking and notes.
- Reorganized navigation around the user workflow: Home → Find Jobs → Applications → Career Profile.
- Upgraded the supported desktop runtime to **Electron 44.4.5** and the development baseline to **Node.js 22.12+**.
- Upgraded the build/toolchain stack to **Vite 8** and **TypeScript 7**.
- Modernized Electron notarization/fuse tooling and repaired ESM/CJS boundaries.
- Fixed intermittent SQLite lock contention with a bounded SQLite client timeout.
- Completed a broad dependency-security cleanup. The release-prep dependency audit reports no known npm vulnerabilities.
- Updated Electron E2E coverage to the current accessible UI.

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Why Job Ranger Exists

Job searching contains an absurd amount of clerical work. People repeatedly check the same career pages, lose track of what changed, forget which jobs they already reviewed, and maintain increasingly haunted browser-tab collections.

Job Ranger automates and organizes the repetitive parts while leaving career decisions with the user:

- monitor selected employers and career pages;
- store job-search state locally;
- explain which listings appear relevant and why;
- track applications and notes;
- distinguish reliable source support from best-effort extraction;
- filter noise by title, keyword, salary, and location;
- receive desktop notifications for new results;
- remain useful without cloud accounts or inference.

## Current Capabilities

| Capability | Status | Notes |
| --- | --- | --- |
| Desktop application | **Shipped** | Electron + React desktop app. |
| Local job-source persistence | **Shipped** | SQLite-backed companies, jobs, filters, settings, and scrape history. |
| Career Profile | **Shipped** | Local profile for target roles, location, pay, skills, credentials, and preferences. |
| Deterministic fit guidance | **Shipped** | Evidence-based local scoring and explanations. It is guidance, not a hiring prediction. |
| Application tracking | **Shipped** | Local statuses and notes for jobs the user chooses to track. |
| Career-page monitoring | **Shipped** | User-selected employer sources with scheduled/background scraping. |
| Structured ATS adapters | **Shipped** | Greenhouse, Lever, SmartRecruiters, and Ashby. |
| Browser/generic extraction | **Shipped, best effort** | Workday, iCIMS, BambooHR, Taleo, Oracle, Microsoft, and generic career pages are classified honestly by support level. |
| Filters | **Shipped** | Title, keyword, salary, and location criteria. |
| Desktop notifications | **Shipped** | Configurable new-job and matched-job notifications. |
| System tray behavior | **Shipped** | Optional minimize-to-tray operation. |
| Windows release | **Shipped** | v1.1.1 Windows x64 installer with bundled SQLite runtime. |
| macOS releases | **Shipped** | v1.1.1 x64 and arm64 DMG/ZIP artifacts. |
| Linux distribution | **Not shipped** | No supported packaged Linux release is currently published. |
| Resume/import intelligence | **Planned** | Must preserve factual evidence and remain useful without inference. |
| Auto-apply | **Not a current product goal** | Job Ranger assists decisions rather than impersonating the user. |

### Persistence note

Companies, jobs, filters, settings, and scrape history use the SQLite-backed desktop repository. Career Profile and Applications are currently stored locally in renderer storage and are planned to move behind the same SQLite/backend boundary. They are local today, but not yet on the final durable persistence architecture.

## Source Support Model

Job Ranger deliberately avoids pretending every careers site is equally automatable.

| Support level | Meaning |
| --- | --- |
| `supported` | A structured adapter exists and is the preferred path. |
| `detected` | Job Ranger recognizes the portal and can attempt generic/browser extraction. Results can vary with site structure. |
| `browser-required` | A browser-backed extraction path is required. |
| `manual-review` | No reliable automated path is currently claimed. |

Current structured adapters are Greenhouse, Lever, SmartRecruiters, and Ashby. Other recognized sources include Workday, iCIMS, BambooHR, Taleo, Oracle Careers, Microsoft Careers, and generic HTML career pages.

## Product Principles

### Local first

Search state is stored locally. Job Ranger does not require a hosted account or cloud backend for its core workflow.

### Useful before AI

Discovery, persistence, filtering, monitoring, career-profile matching, and application tracking work deterministically. Optional inference can improve future explanations, resume tailoring, interview preparation, and career guidance, but it must not become a prerequisite for using the application.

### Consumer first

A job seeker should not need software-development skills to use Job Ranger. Technical implementation details belong behind the interface.

### Evidence over confidence

When Job Ranger cannot reliably extract or interpret something, it should expose the limitation rather than fabricate certainty. Career Profile deliberately does not infer credentials the user did not provide.

### User authority

Job Ranger assists the user's search. It does not make irreversible career decisions or apply to jobs on the user's behalf.

## Architecture

```text
React renderer
  |-- Home / Find Jobs / Applications / Career Profile
  |-- Companies / Filters / Settings
  |
  v
Electron preload / typed IPC boundary
  |
  v
Desktop backend
  |        |        |
  v        v        v
SQLite   Scrapers  Runtime / OS services
           |
           +--> Structured ATS adapters
           +--> Generic HTML extraction
           +--> Browser-backed extraction
```

Security-relevant renderer boundaries include `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, URL validation before opening external links, and a renderer Content Security Policy.

See [docs/ARCHITECTURE_PLAN.md](./docs/ARCHITECTURE_PLAN.md) for architecture and planned evolution.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/` | React renderer, Career Intelligence UI/domain code, components, state, and shared contracts. |
| `electron/src/` | TypeScript source for the privileged desktop runtime and backend. |
| `electron/` | Compiled desktop runtime files used by packaged execution. |
| `tests/` | Unit, backend smoke, and Electron Playwright coverage. |
| `public/` | Runtime static assets, including the canonical application icon. |
| `docs/assets/branding/` | README/banner/logo/social-preview assets. |
| `docs/` | Product, architecture, system-state, validation evidence, and planning documentation. |
| `.github/` | CI, release automation, and dependency automation. |

## Development

The following is for people building or modifying Job Ranger from source. Normal users should use the installers at the top of this README.

### Prerequisites

- Node.js `>=22.12.0`
- npm
- a working `sqlite3` executable available on `PATH`, or `SQLITE3_PATH` set explicitly

The `sqlite3` prerequisite applies to source/development runs. Published Windows installers bundle their own verified SQLite CLI.

### Setup

```bash
npm ci
npm run repo:health
npm run electron:dev
```

### Quality Commands

```bash
npm run typecheck
npm run build
npm run test
npm run test:unit
npm run test:e2e
npm run repo:health
```

Pull requests are gated by CI running a clean install, dependency audit reporting, and the repository-health baseline. Electron E2E is also used for runtime/release validation.

## Packaging

```bash
npm run electron:build
npm run electron:build:win
npm run electron:build:mac
npm run electron:pack
```

Electron Builder is configured for Windows and macOS targets. Published release artifacts are the source of truth for what users can actually download. The Windows release workflow stages and verifies the pinned SQLite CLI before packaging. macOS notarization runs when the required Apple credentials are available to the release environment.

The canonical runtime icon is [`public/ICON.png`](./public/ICON.png). Brand presentation assets live under [`docs/assets/branding/`](./docs/assets/branding/).

## Roadmap

With the Career Intelligence foundation and coordinated toolchain modernization landed, near-term work shifts toward product maturity:

1. Move Career Profile and Applications from renderer storage into the SQLite/backend domain.
2. Add first-run onboarding and consumer-friendly source discovery so users do not need to know ATS/career-page URLs in advance.
3. Add resume import and an evidence model that prevents fabricated claims.
4. Add optional provider-agnostic inference for richer explanations and preparation while preserving deterministic operation.
5. Continue improving best-effort source reliability and decide explicitly whether Linux becomes a supported packaged target.

See [docs/planning/PLAN.md](./docs/planning/PLAN.md) for the active roadmap and [docs/README.md](./docs/README.md) for documentation status.

## Governance, Security, and Attribution

- [CONTRIBUTING.md](./CONTRIBUTING.md) explains contribution expectations.
- [GOVERNANCE.md](./GOVERNANCE.md) describes decision authority and merge standards.
- [SECURITY.md](./SECURITY.md) describes the supported security posture and reporting path.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) defines community expectations.
- [docs/BRANDING.md](./docs/BRANDING.md) defines canonical brand assets and usage.
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) records attribution and runtime provenance for third-party/open-source ancestry, including Career-Ops and bundled SQLite.

## License

Job Ranger is open source under the [MIT License](./LICENSE).

Third-party dependencies and adapted open-source components retain their own copyright and license obligations or public-domain status. Required attribution and provenance are preserved in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
