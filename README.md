<p align="center">
  <img src="docs/assets/branding/job-ranger-banner.png" alt="Job Ranger - Find Your Next Opportunity" width="100%" />
</p>

# Job Ranger

<p align="center">
  <strong>A local-first desktop companion for finding, monitoring, and managing job opportunities without turning your search into somebody else's cloud product.</strong>
</p>

<p align="center">
  <a href="https://github.com/Knapp-Kevin/job-ranger/releases/tag/v1.0.2"><img src="https://img.shields.io/badge/release-v1.0.2-0f172a.svg" alt="Release v1.0.2" /></a>
  <a href="https://github.com/Knapp-Kevin/job-ranger/actions/workflows/ci.yml"><img src="https://github.com/Knapp-Kevin/job-ranger/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-2563eb.svg" alt="Windows and macOS" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-15803d.svg" alt="MIT License" /></a>
</p>

## Install Job Ranger

**You do not need Git, Node.js, npm, a terminal, or an AI account to use Job Ranger.** Download the desktop build for your computer and run it.

### Windows

**[Download Job Ranger v1.0.2 for Windows x64 (.exe)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.0.2/Job.Ranger-v1.0.2-windows-x64.exe)**

1. Download the single `.exe` file.
2. Open the downloaded file.
3. Follow the Windows prompts and launch **Job Ranger**.

### macOS

Choose the build that matches your Mac:

- **[Apple Silicon / M-series Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.0.2/Job.Ranger-v1.0.2-macos-arm64.dmg)**
- **[Intel Mac (.dmg)](https://github.com/Knapp-Kevin/job-ranger/releases/download/v1.0.2/Job.Ranger-v1.0.2-macos-x64.dmg)**

Open the downloaded `.dmg`, move Job Ranger into **Applications** if prompted, then launch it normally. If you are not sure which Mac you have, open **Apple menu → About This Mac** and look for either an Apple M-series chip or an Intel processor.

Prefer to inspect the release first? See the [latest Job Ranger release](https://github.com/Knapp-Kevin/job-ranger/releases/latest).

### Start using it

Once Job Ranger opens:

1. Open **Companies**.
2. Choose **Add source**.
3. Enter an employer name and paste its careers-page URL.
4. Run a scrape or let Job Ranger check it on the configured schedule.
5. Review new opportunities under **Jobs**.
6. Use **Filters** to narrow results by title, keywords, salary, or location.
7. Turn on desktop notifications in **Settings** if you want Job Ranger to alert you when something new appears.

For user-facing troubleshooting, see [HELP.md](./HELP.md).

## Status

**Functional and actively evolving.** Job Ranger v1.0.2 is the current published release. It can monitor selected company career pages, persist jobs and settings locally, filter results, run background checks, and notify you about new opportunities.

The next product direction is broader than career-page monitoring: Job Ranger is being evolved into a consumer-friendly job-search workspace that can help ordinary users understand fit, track applications, and prepare next steps without requiring GitHub, YAML, terminals, or an AI account. That work is active in [PR #28](https://github.com/Knapp-Kevin/job-ranger/pull/28) and is **not part of v1.0.2 yet**.

## Why Job Ranger Exists

Job searching has an absurd amount of clerical work hiding inside it. People repeatedly check the same career pages, lose track of what changed, forget which roles they already reviewed, and maintain increasingly haunted browser-tab collections.

Job Ranger automates the repetitive parts while keeping the user in control:

- monitor selected employers and career pages;
- store job-search state locally;
- distinguish reliable source support from best-effort extraction;
- filter noise by title, keyword, salary, and location;
- receive desktop notifications for new results;
- keep the product useful without requiring cloud accounts or inference.

## Current Capabilities

| Capability | Status | Notes |
| --- | --- | --- |
| Desktop application | **Shipped** | Electron + React desktop app. |
| Local persistence | **Shipped** | SQLite-backed companies, jobs, filters, settings, and scrape history. |
| Career-page monitoring | **Shipped** | User-selected employer sources with scheduled/background scraping. |
| Structured ATS adapters | **Shipped** | Greenhouse, Lever, SmartRecruiters, and Ashby. |
| Browser/generic extraction | **Shipped, best effort** | Workday, iCIMS, BambooHR, Taleo, Oracle, Microsoft, and generic career pages are classified honestly by support level. |
| Filters | **Shipped** | Title, keyword, salary, and location criteria. |
| Desktop notifications | **Shipped** | Configurable new-job and matched-job notifications. |
| System tray behavior | **Shipped** | Optional minimize-to-tray operation. |
| Windows release | **Shipped** | v1.0.2 Windows x64 executable. |
| macOS releases | **Shipped** | v1.0.2 x64 and arm64 DMG/ZIP artifacts. |
| Linux distribution | **Not shipped** | No supported packaged Linux release is currently published. |
| Career profile and fit guidance | **In development** | Active in PR #28; not part of the published release. |
| Application tracking | **In development** | Active in PR #28; not part of the published release. |
| Resume/import intelligence | **Planned** | Must preserve factual evidence and remain usable without inference. |
| Auto-apply | **Not a current product goal** | Job Ranger should assist decisions, not impersonate the user. |

Job Ranger is currently best treated as a personal desktop application. It is functional, but still under active modernization and product expansion.

## Source Support Model

Job Ranger deliberately avoids pretending that every careers site is equally automatable.

| Support level | Meaning |
| --- | --- |
| `supported` | A structured adapter exists and is the preferred path. |
| `detected` | Job Ranger recognizes the portal and can attempt generic/browser extraction. Results can vary with site structure. |
| `browser-required` | A browser-backed extraction path is required. |
| `manual-review` | No reliable automated path is currently claimed. |

Current structured adapters are Greenhouse, Lever, SmartRecruiters, and Ashby. Other recognized sources include Workday, iCIMS, BambooHR, Taleo, Oracle Careers, Microsoft Careers, and generic HTML career pages.

## Product Principles

### Local first

Search state is stored locally. Job Ranger does not require a cloud account or hosted backend to perform its core workflow.

### Useful before AI

Core discovery, persistence, filtering, monitoring, and application-state functionality should work deterministically. Optional inference can improve explanations, resume tailoring, interview preparation, and career guidance later, but it must not become the key that opens the application.

### Consumer first

A job seeker should not need software-development skills to use Job Ranger. Technical implementation details belong behind the interface, not in the user's way.

### Evidence over confidence

When Job Ranger cannot reliably extract or interpret something, it should expose the limitation rather than fabricate certainty.

### User authority

Job Ranger assists the user's search. It does not make irreversible career decisions or apply to jobs on the user's behalf without explicit, future product-level governance.

## Architecture

```text
React renderer
      |
      v
Electron preload / IPC boundary
      |
      v
Desktop backend
  |        |        |
  v        v        v
SQLite   Scrapers  Runtime settings
           |
           +--> Structured ATS adapters
           +--> Generic HTML extraction
           +--> Browser-backed extraction
```

Security-relevant renderer boundaries currently include `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, URL validation before opening external links, and a renderer Content Security Policy.

See [docs/ARCHITECTURE_PLAN.md](./docs/ARCHITECTURE_PLAN.md) for the current architecture and evolution plan.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/` | React renderer, pages, components, state, and shared contracts. |
| `electron/src/` | TypeScript source for the desktop runtime and backend. |
| `electron/` | Compiled desktop runtime files used by packaged execution. |
| `tests/` | Unit, backend smoke, and Electron Playwright coverage. |
| `public/` | Runtime static assets, including the canonical application icon. |
| `docs/assets/branding/` | README/banner/logo/social-preview assets. |
| `docs/` | Product, architecture, system-state, and historical planning documentation. |
| `.github/` | CI and dependency automation. |

## Development

The following is only for people who want to build or modify Job Ranger from source. Normal users should use the installers at the top of this README.

### Prerequisites

- Node.js `>=20.19.0`
- npm
- a working `sqlite3` executable available on `PATH`, or `SQLITE3_PATH` set explicitly

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

Pull requests are automatically gated by CI running `npm ci` and `npm run repo:health`.

## Packaging

```bash
npm run electron:build
npm run electron:build:win
npm run electron:build:mac
npm run electron:pack
```

Electron Builder is configured for Windows NSIS/portable targets and macOS DMG/ZIP targets. Published artifacts may differ from every locally configured target, so the release page is the source of truth for what users can actually download.

The canonical runtime icon remains [`public/ICON.png`](./public/ICON.png). Brand presentation assets live under [`docs/assets/branding/`](./docs/assets/branding/).

## Roadmap

Near-term work is organized around four tracks:

1. **Consumer workflow:** career profile, job-fit explanations, and application tracking, beginning with PR #28.
2. **Discovery:** reduce the need for users to manually know which company career pages to add.
3. **Career intelligence:** resume evidence, skill/credential gaps, optional inference, and decision support without making AI mandatory.
4. **Platform health:** dependency hygiene and coordinated modernization of Node, Electron, Vite, and Electron tooling under [issue #38](https://github.com/Knapp-Kevin/job-ranger/issues/38).

See [docs/planning/PLAN.md](./docs/planning/PLAN.md) for the active roadmap and [docs/README.md](./docs/README.md) for documentation status.

## Governance and Security

- [CONTRIBUTING.md](./CONTRIBUTING.md) explains contribution expectations.
- [GOVERNANCE.md](./GOVERNANCE.md) describes project decision authority and merge standards.
- [SECURITY.md](./SECURITY.md) describes the supported security posture and reporting path.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) defines community expectations.
- [docs/BRANDING.md](./docs/BRANDING.md) defines canonical brand assets and usage.

## License

Job Ranger is open source under the [MIT License](./LICENSE).

Third-party dependencies and any future adapted open-source components retain their own copyright and license obligations. Where Job Ranger incorporates substantial third-party source material, attribution must be preserved explicitly.
